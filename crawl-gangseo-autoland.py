from __future__ import annotations

import argparse
import html
import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE_URL = "https://cha894.com"
LIST_URL = f"{BASE_URL}/coop/list.html"
COMPLEX_ID = "seoul-gangseo-autoland"
TAG_RE = re.compile(r"<[^>]+>")

def clean(value: str | None) -> str | None:
    if value is None:
        return None
    text = html.unescape(TAG_RE.sub("", value)).replace("\xa0", " ").strip()
    return None if text in {"", "--", "-"} else re.sub(r"\s+", " ", text)

def fetch(url: str, attempts: int = 3) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Chrome/140.0"})
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                return response.read().decode("euc-kr", errors="replace")
        except Exception as error:
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(0.6 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")

def first(pattern: str, source: str) -> str | None:
    match = re.search(pattern, source, flags=re.IGNORECASE | re.DOTALL)
    return clean(match.group(1)) if match else None

def first_url(style: str) -> str | None:
    for candidate in re.findall(r"url\(([^)]*)\)", style):
        value = candidate.strip(" '\"")
        if value.startswith("http"):
            return value
    return None

def parse_companies(source: str) -> list[dict]:
    pattern = re.compile(
        r'<p class="txt-sangsa">(?P<name>.*?)</p>.*?'
        r'<li><span>대표</span><span class="bold">(?P<representative>.*?)</span></li>.*?'
        r'<li><span>연락처</span><span>(?P<phone>.*?)</span></li>.*?'
        r'<li><span>팩스</span><span>(?P<fax>.*?)</span></li>.*?'
        r"list_dealer\.html\?sangsaKey=(?P<id>\d+)",
        flags=re.I | re.S,
    )
    companies = []
    for match in pattern.finditer(source):
        company_id = match.group("id")
        companies.append({
            "id": company_id, "complexId": COMPLEX_ID,
            "name": clean(match.group("name")), "representative": clean(match.group("representative")),
            "phone": clean(match.group("phone")), "fax": clean(match.group("fax")),
            "address": None, "inventoryCount": 0, "dealerCount": 0,
            "sourceUrl": f"{BASE_URL}/coop/list_dealer.html?sangsaKey={company_id}",
        })
    return companies

def parse_company_detail(source: str) -> dict:
    info_match = re.search(r'<div class="sangsa-info">(.*?)</div>\s*</div>', source, flags=re.I | re.S)
    info = info_match.group(1) if info_match else source
    figure_match = re.search(r'<figure[^>]*style="([^"]+)"', info, flags=re.S)
    return {
        "address": first(r"<span>주소</span><span>(.*?)</span>", info),
        "inventoryCount": int(first(r"<span>보유차량</span>\s*<span>\s*(\d+)대", info) or 0),
        "thumbnailUrl": first_url(figure_match.group(1)) if figure_match else None,
    }

def parse_dealers(source: str, company_id: str) -> list[dict]:
    pattern = re.compile(
        r'<figure class="profile"[^>]*style="(?P<style>[^"]*)"[^>]*></figure>\s*'
        r'<p class="txt-name">(?P<name>.*?)</p>.*?'
        r'<li><span>소속상사</span><span class="bold">(?P<company>.*?)</span></li>.*?'
        r'<li><span>보유차량</span><span>(?P<count>\d+)대</span></li>.*?'
        r"dealerId=(?P<id>[A-Z0-9-]+)", flags=re.I | re.S,
    )
    return [{
        "id": match.group("id"), "companyId": company_id,
        "name": clean(match.group("name")), "companyName": clean(match.group("company")),
        "inventoryCount": int(match.group("count")),
        "profileImageUrl": first_url(match.group("style")),
        "sourceUrl": f"{BASE_URL}/car/car_list_sangsa.html?sangsaFlag=Y&sangsaKey={company_id}&dealerId={match.group('id')}",
    } for match in pattern.finditer(source)]

def crawl(delay: float) -> dict:
    companies = parse_companies(fetch(LIST_URL))
    dealers_by_id: dict[str, dict] = {}
    for index, company in enumerate(companies, start=1):
        source = fetch(company["sourceUrl"])
        company.update(parse_company_detail(source))
        company_dealers = parse_dealers(source, company["id"])
        company["dealerCount"] = len(company_dealers)
        for dealer in company_dealers:
            dealers_by_id[dealer["id"]] = dealer
        print(f"[{index:02d}/{len(companies):02d}] {company['name']}: {len(company_dealers)} dealers")
        time.sleep(delay)

    collected_at = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
    return {
        "schemaVersion": 1, "collectedAt": collected_at,
        "sources": [
            {"name": "강서오토랜드 회원사 소개", "url": LIST_URL, "kind": "official_association"},
            {"name": "강서오토랜드 소속딜러", "urlTemplate": f"{BASE_URL}/coop/list_dealer.html?sangsaKey={{companyId}}", "kind": "official_association"},
        ],
        "complexes": [{
            "id": COMPLEX_ID, "regionId": "seoul", "region": "서울", "district": "강서구",
            "name": "강서오토랜드", "officialName": "서울강서자동차매매조합",
            "address": "서울특별시 강서구 양천로 434 (등촌동 15-1)",
            "phone": "02-2659-7676", "fax": "02-2659-2760", "thumbnailUrl": None,
            "companyCount": len(companies), "dealerCount": len(dealers_by_id), "sourceUrl": LIST_URL,
        }],
        "companies": companies,
        "dealers": sorted(dealers_by_id.values(), key=lambda item: (item["companyName"] or "", item["name"] or "")),
    }

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("gangseo-autoland.json"))
    parser.add_argument("--delay", type=float, default=0.12)
    args = parser.parse_args()
    result = crawl(args.delay)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(result['companies'])} companies and {len(result['dealers'])} dealers to {args.output}")

if __name__ == "__main__":
    main()
