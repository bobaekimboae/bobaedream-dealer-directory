import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import sourceData from "./gangseo-autoland.json";
import { DealerStudio } from "./dealer-studio";


type Mode = "complex" | "dealer";
type Company = { id:string; complexId:string; name:string; representative:string|null; phone:string|null; fax:string|null; address:string|null; inventoryCount:number; dealerCount:number; sourceUrl:string };
type Dealer = { id:string; companyId:string; name:string; companyName:string; inventoryCount:number; profileImageUrl:string|null; sourceUrl:string };
type Complex = { id:string; regionId:string; region:string; district:string; name:string; officialName:string; address:string; phone:string; fax:string; thumbnailUrl:string|null; companyCount:number; dealerCount:number; sourceUrl:string };
type Dataset = { schemaVersion:number; collectedAt:string; complexes:Complex[]; companies:Company[]; dealers:Dealer[] };
type Selection = { mode:Mode; regionId?:string; complexId?:string; companyId?:string; dealerId?:string; query:string };

const data = sourceData as Dataset;
const liveComplex = data.complexes[0];
const regions = [
  { id:"seoul", name:"서울" },
  { id:"gyeonggi", name:"경기" },
  { id:"incheon", name:"인천" },
];
const popularComplexes = [
  { id:liveComplex.id, regionId:"seoul", name:liveComplex.name, meta:`${liveComplex.companyCount}개 상사 · ${liveComplex.dealerCount}명 딜러`, live:true },
  { id:"seoul-janganpyeong", regionId:"seoul", name:"장안평 자동차시장", meta:"서울 성동구 · 수집 예정", live:false },
  { id:"seoul-auto-gallery", regionId:"seoul", name:"서울오토갤러리", meta:"서울 서초구 · 수집 예정", live:false },
  { id:"gyeonggi-suwon", regionId:"gyeonggi", name:"수원 도이치오토월드", meta:"경기 수원 · 수집 예정", live:false },
  { id:"incheon-mpark", regionId:"incheon", name:"엠파크", meta:"인천 서구 · 수집 예정", live:false },
];

function readSelection():Selection {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get("directory") === "dealer" ? "dealer" : "complex",
    regionId: params.get("region") || undefined,
    complexId: params.get("complex") || undefined,
    companyId: params.get("company") || undefined,
    dealerId: params.get("dealer") || undefined,
    query: params.get("q") || "",
  };
}
function selectionUrl(next:Selection) {
  const params = new URLSearchParams();
  params.set("directory", next.mode);
  if (next.regionId) params.set("region", next.regionId);
  if (next.complexId) params.set("complex", next.complexId);
  if (next.companyId) params.set("company", next.companyId);
  if (next.dealerId) params.set("dealer", next.dealerId);
  if (next.query.trim()) params.set("q", next.query.trim());
  return `?${params.toString()}`;
}
function formatCollectedAt(value:string) {
  const date = new Date(value);
  return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,"0")}.${String(date.getDate()).padStart(2,"0")} 수집`;
}
function includesQuery(values:Array<string|null|undefined>, query:string) {
  const keyword = query.trim().toLocaleLowerCase("ko");
  return !keyword || values.some((value) => value?.toLocaleLowerCase("ko").includes(keyword));
}

function App() {
  const [selection, setSelection] = useState<Selection>(readSelection);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const handlePopState = () => setSelection(readSelection());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const commit = (next:Selection, replace=false) => {
    setSelection(next);
    window.history[replace ? "replaceState" : "pushState"]({}, "", selectionUrl(next));
  };

  const selectedComplex = data.complexes.find((item) => item.id === selection.complexId);
  const selectedCompany = data.companies.find((item) => item.id === selection.companyId);
  const selectedDealer = data.dealers.find((item) => item.id === selection.dealerId);

  const companies = useMemo(() => data.companies
    .filter((company) => !selection.complexId || company.complexId === selection.complexId)
    .filter((company) => includesQuery([company.name, company.representative], selection.query))
    .sort((a,b) => b.dealerCount-a.dealerCount || a.name.localeCompare(b.name,"ko")),
  [selection.complexId, selection.query]);

  const dealers = useMemo(() => data.dealers
    .filter((dealer) => (selection.mode === "dealer" && selection.query.trim()) || !selection.companyId || dealer.companyId === selection.companyId)
    .filter((dealer) => includesQuery([dealer.name, dealer.companyName, dealer.id], selection.query))
    .sort((a,b) => b.inventoryCount-a.inventoryCount || a.name.localeCompare(b.name,"ko")),
  [selection.companyId, selection.mode, selection.query]);

  const searchAcrossDealers = selection.mode === "dealer" && selection.query.trim().length > 0;
  const visiblePopular = popularComplexes.filter((item) => !selection.regionId || item.regionId === selection.regionId);
  const selectRegion = (regionId:string) => commit({ ...selection, regionId, complexId:undefined, companyId:undefined, dealerId:undefined });
  const selectComplex = (complex:typeof popularComplexes[number]) => {
    if (!complex.live) { setNotice(`${complex.name} 데이터는 다음 수집 대상입니다.`); return; }
    commit({ ...selection, regionId:complex.regionId, complexId:complex.id, companyId:undefined, dealerId:undefined });
  };
  const selectCompany = (companyId:string) => commit({ ...selection, companyId, dealerId:undefined });
  const selectDealer = (dealerId:string) => {
    const dealer = data.dealers.find((item) => item.id === dealerId);
    const company = data.companies.find((item) => item.id === dealer?.companyId);
    const complex = data.complexes.find((item) => item.id === company?.complexId);
    commit({
      ...selection,
      regionId: complex?.regionId ?? selection.regionId,
      complexId: company?.complexId ?? selection.complexId,
      companyId: company?.id ?? selection.companyId,
      dealerId,
    });
  };

  return <div className="stage"><main className="directory">
    <header className="topbar">
      <button type="button" className="text-button" onClick={() => window.location.assign("./")}>중고차 홈</button>
      <strong>보배드림</strong><button type="button" className="studio-entry" onClick={() => window.location.assign("?service=shorts")}>딜러용</button>
    </header>

    <section className="intro">
      <p>중고차 하위 메뉴</p><h1>매매단지·딜러 찾기</h1>
      <span>공식 조합 정보를 지역부터 단계별로 확인하세요.</span>
    </section>

    <nav className="mode-tabs" aria-label="검색 유형">
      {(["complex","dealer"] as Mode[]).map((mode) => <button key={mode} type="button" aria-pressed={selection.mode===mode} className={selection.mode===mode?"is-active":""} onClick={() => commit({ ...selection, mode, dealerId:undefined })}>{mode==="complex"?"매매단지":"딜러"}</button>)}
    </nav>

    <section className="search-panel"><label>
      <span className="sr-only">{selection.mode==="dealer"?"딜러 또는 상사 검색":"매매단지 또는 상사 검색"}</span>
      <input type="search" placeholder={selection.mode==="dealer"?"딜러명, 상사명, 사원증 번호 검색":"매매단지명, 상사명 검색"} value={selection.query} onChange={(event) => commit({ ...selection, query:event.currentTarget.value, dealerId:undefined }, true)} />
    </label></section>

    <nav className="steps" aria-label="검색 단계">
      <button type="button" className={selection.regionId?"is-done":"is-current"} onClick={() => commit({ ...selection, regionId:undefined, complexId:undefined, companyId:undefined, dealerId:undefined })}>지역</button>
      <button type="button" disabled={!selection.regionId} className={selection.complexId?"is-done":selection.regionId?"is-current":""} onClick={() => commit({ ...selection, complexId:undefined, companyId:undefined, dealerId:undefined })}>단지</button>
      <button type="button" disabled={!selection.complexId} className={selection.companyId?"is-done":selection.complexId?"is-current":""} onClick={() => commit({ ...selection, companyId:undefined, dealerId:undefined })}>상사</button>
      <button type="button" disabled={!selection.companyId} className={selection.dealerId?"is-done":selection.companyId?"is-current":""} onClick={() => commit({ ...selection, dealerId:undefined })}>딜러</button>
    </nav>

    {!searchAcrossDealers && !selection.complexId ? <>
      <section className="section">
        <div className="section-heading"><h2>지역</h2><small>우선 수도권부터 제공합니다.</small></div>
        <div className="region-chips">{regions.map((region) => <button key={region.id} type="button" aria-pressed={selection.regionId===region.id} className={selection.regionId===region.id?"is-selected":""} onClick={() => selectRegion(region.id)}>{region.name}</button>)}</div>
      </section>
      <section className="section">
        <div className="section-heading"><h2>{selection.regionId?"해당 지역 단지":"인기 단지"}</h2><small>검증된 데이터부터 순차 연결합니다.</small></div>
        <div className="complex-rail">{visiblePopular.map((complex) => <button type="button" key={complex.id} className={complex.live?"complex-chip is-live":"complex-chip"} onClick={() => selectComplex(complex)}>
          <strong>{complex.name}</strong><span>{complex.meta}</span><em>{complex.live?"공식 데이터":"준비 중"}</em>
        </button>)}</div>
      </section>
    </> : null}

    {searchAcrossDealers ? <section className="section results-section">
      <div className="section-heading"><h2>딜러 검색 결과</h2><small>{dealers.length}명</small></div>
      <div className="dealer-list">{dealers.map((dealer) => <DealerCard key={dealer.id} dealer={dealer} onSelect={() => selectDealer(dealer.id)} selected={dealer.id===selection.dealerId} />)}
      {!dealers.length ? <EmptyState title="검색 결과가 없습니다" description="딜러명이나 상사명을 다시 확인해 주세요." /> : null}</div>
    </section> : null}

    {selectedComplex && !searchAcrossDealers ? <>
      <section className="complex-summary">
        <div><span>{selectedComplex.region} {selectedComplex.district}</span><h2>{selectedComplex.name}</h2><p>{selectedComplex.officialName}</p></div>
        <dl><div><dt>상사</dt><dd>{selectedComplex.companyCount}곳</dd></div><div><dt>딜러</dt><dd>{selectedComplex.dealerCount}명</dd></div><div><dt>수집일</dt><dd>{formatCollectedAt(data.collectedAt).replace(" 수집","")}</dd></div></dl>
        <address>{selectedComplex.address}</address>
      </section>
      {!selectedCompany ? <section className="section results-section">
        <div className="section-heading"><h2>입점 상사</h2><small>{companies.length}곳</small></div>
        <div className="company-list">{companies.map((company) => <button type="button" key={company.id} className="company-row" onClick={() => selectCompany(company.id)}>
          <span><strong>{company.name}</strong><small>대표 {company.representative||"정보 없음"} · 딜러 {company.dealerCount}명</small></span><b>보기</b>
        </button>)}</div>
      </section> : null}
    </> : null}

    {selectedCompany && !searchAcrossDealers ? <>
      <section className="company-summary">
        <button type="button" className="subtle-button" onClick={() => commit({ ...selection, companyId:undefined, dealerId:undefined })}>강서오토랜드 상사 목록</button>
        <h2>{selectedCompany.name}</h2><p>대표 {selectedCompany.representative||"정보 없음"}</p>
        <div><span>소속딜러 {selectedCompany.dealerCount}명</span><span>보유매물 {selectedCompany.inventoryCount}대</span></div>
        {selectedCompany.phone ? <a href={`tel:${selectedCompany.phone}`}>{selectedCompany.phone}</a> : null}
      </section>
      {selectedDealer ? <section className="dealer-detail">
        <span>선택한 딜러</span><h2>{selectedDealer.name}</h2><p>{selectedDealer.companyName} · 사원증 {selectedDealer.id}</p>
        <strong>보유매물 {selectedDealer.inventoryCount}대</strong>
        <a href={selectedDealer.sourceUrl} target="_blank" rel="noreferrer">공식 페이지에서 확인</a>
      </section> : null}
      <section className="section results-section">
        <div className="section-heading"><h2>소속 딜러</h2><small>{dealers.length}명</small></div>
        <div className="dealer-list">{dealers.map((dealer) => <DealerCard key={dealer.id} dealer={dealer} onSelect={() => selectDealer(dealer.id)} selected={dealer.id===selection.dealerId} />)}
        {!dealers.length ? <EmptyState title="등록 딜러가 없습니다" description="공식 페이지에 공개된 딜러가 아직 없습니다." /> : null}</div>
      </section>
    </> : null}

    <footer><p>{formatCollectedAt(data.collectedAt)} · 강서오토랜드 공식 공개 정보</p><a href={liveComplex.sourceUrl} target="_blank" rel="noreferrer">원본 출처 확인</a></footer>
    {notice ? <div className="toast" role="status">{notice}</div> : null}
  </main></div>;
}

function DealerCard({dealer,onSelect,selected}:{dealer:Dealer;onSelect:()=>void;selected:boolean}) {
  const imageUrl = dealer.profileImageUrl?.replace("http://","https://");
  return <button type="button" className={selected?"dealer-card is-selected":"dealer-card"} onClick={onSelect}>
    {imageUrl ? <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden=true; }} /> : null}
    <span><strong>{dealer.name}</strong><small>{dealer.companyName}</small><em>사원증 {dealer.id} · 보유매물 {dealer.inventoryCount}대</em></span><b>{selected?"선택됨":"보기"}</b>
  </button>;
}
function EmptyState({title,description}:{title:string;description:string}) {
  return <div className="empty-state"><strong>{title}</strong><p>{description}</p></div>;
}
const showDirectory = new URLSearchParams(window.location.search).get("service") === "directory";
createRoot(document.getElementById("root")!).render(<StrictMode>{showDirectory ? <App /> : <DealerStudio />}</StrictMode>);
