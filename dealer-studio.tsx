import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type Step = "source" | "design" | "export" | "publish";
type TemplateId = "signature" | "clean" | "performance" | "reviewer";
type SourceMode = "url" | "plate" | "manual";
type ChannelId = "youtube" | "instagram" | "tiktok";
type ChannelStatus = "ready" | "publishing" | "published" | "failed";
type MusicId = "none" | "drive" | "luxury";
type VoiceId = "calm" | "energetic";
type MediaItem = { id:string; name:string; url:string; owned?:boolean };

const demoMedia:MediaItem[] = [
  { id:"demo-1", name:"전면", url:`${import.meta.env.BASE_URL}demo-car/front.svg` },
  { id:"demo-2", name:"정측면", url:`${import.meta.env.BASE_URL}demo-car/angle.svg` },
  { id:"demo-3", name:"운전석", url:`${import.meta.env.BASE_URL}demo-car/interior.svg` },
  { id:"demo-4", name:"후면", url:`${import.meta.env.BASE_URL}demo-car/rear.svg` },
  { id:"demo-5", name:"측면", url:`${import.meta.env.BASE_URL}demo-car/angle.svg` },
  { id:"demo-6", name:"계기판", url:`${import.meta.env.BASE_URL}demo-car/interior.svg` },
  { id:"demo-7", name:"휠·타이어", url:`${import.meta.env.BASE_URL}demo-car/angle.svg` },
  { id:"demo-8", name:"트렁크", url:`${import.meta.env.BASE_URL}demo-car/rear.svg` },
];

const channels:Array<{id:ChannelId;name:string;note:string}> = [
  {id:"youtube",name:"YouTube Shorts",note:"공개 · 즉시 게시"},
  {id:"instagram",name:"Instagram Reels",note:"보배모터스 프로 계정"},
  {id:"tiktok",name:"TikTok",note:"검수 후 게시"},
];

const templateOptions:Array<{ id:TemplateId; name:string; description:string }> = [
  { id:"signature", name:"시그니처", description:"브랜드와 가격을 또렷하게" },
  { id:"clean", name:"클린", description:"사진이 돋보이는 미니멀 구성" },
  { id:"performance", name:"퍼포먼스", description:"빠른 전환과 강한 스펙 강조" },
  { id:"reviewer", name:"리뷰어", description:"첫 2초 후킹과 핵심 한 줄 강조" },
];

const defaultListing = {
  title:"벤츠 G클래스 G63 AMG",
  trim:"매뉴팩처 프로그램 · 무사고",
  year:"2021",
  mileage:"42,920",
  fuel:"가솔린",
  price:"9,500",
  dealer:"김보배 딜러",
  company:"보배모터스",
  phone:"010-1234-5678",
  plate:"123가 4567",
  accident:"무사고",
  warranty:"성능점검기록부 제공",
};

export function DealerStudio() {
  const [step,setStep] = useState<Step>("source");
  const [sourceMode,setSourceMode] = useState<SourceMode>("url");
  const [listingUrl,setListingUrl] = useState("https://www.bobaedream.co.kr/mycar/mycar_view.php?no=2250479");
  const [plate,setPlate] = useState("123가4567");
  const [manualMake,setManualMake] = useState("벤츠");
  const [manualModel,setManualModel] = useState("G클래스");
  const [isImporting,setIsImporting] = useState(false);
  const [imported,setImported] = useState(false);
  const [media,setMedia] = useState<MediaItem[]>([]);
  const [listing,setListing] = useState(defaultListing);
  const [template,setTemplate] = useState<TemplateId>("signature");
  const [accent,setAccent] = useState("#e11d2e");
  const [duration,setDuration] = useState(15);
  const [hookText,setHookText] = useState("지금 놓치면 아쉬운 G63");
  const [music,setMusic] = useState<MusicId>("drive");
  const [voice,setVoice] = useState<VoiceId>("energetic");
  const [previewChannel,setPreviewChannel] = useState<ChannelId>("youtube");
  const [currentMedia,setCurrentMedia] = useState(0);
  const [progress,setProgress] = useState(0);
  const [status,setStatus] = useState("대기 중");
  const [videoUrl,setVideoUrl] = useState("");
  const [videoExtension,setVideoExtension] = useState("webm");
  const [error,setError] = useState("");
  const [factsConfirmed,setFactsConfirmed] = useState(false);
  const [selectedChannels,setSelectedChannels] = useState<Record<ChannelId,boolean>>({youtube:true,instagram:true,tiktok:true});
  const [channelStatuses,setChannelStatuses] = useState<Record<ChannelId,ChannelStatus>>({youtube:"ready",instagram:"ready",tiktok:"ready"});
  const [publishMessage,setPublishMessage] = useState("");
  const [inventoryStatus,setInventoryStatus] = useState<"active"|"price-changed"|"sold">("active");
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaItem[]>([]);
  const videoUrlRef = useRef("");

  useEffect(() => { mediaRef.current = media; }, [media]);
  useEffect(() => { videoUrlRef.current = videoUrl; }, [videoUrl]);
  useEffect(() => () => {
    mediaRef.current.filter((item) => item.owned).forEach((item) => URL.revokeObjectURL(item.url));
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
  }, []);

  useEffect(() => {
    if (media.length < 2 || step !== "design") return;
    const timer = window.setInterval(() => setCurrentMedia((value) => (value+1)%media.length), 2200);
    return () => window.clearInterval(timer);
  }, [media.length,step]);

  const canContinue = media.length >= 7 && listing.title.trim() && listing.price.trim() && factsConfirmed;
  const updateListing = (key:keyof typeof listing, value:string) => setListing((current) => ({...current,[key]:value}));
  const hookSuggestions = useMemo(() => [
    `${listing.title}, 이 가격이면 어떨까요?`,
    `${listing.mileage}km · ${listing.accident} 매물`,
    `한눈에 보는 ${listing.title}`,
  ], [listing.title,listing.mileage,listing.accident]);

  const importListing = () => {
    setError("");
    if (sourceMode === "url" && !listingUrl.includes("bobaedream.co.kr")) {
      setError("보배드림 매물 URL을 입력해 주세요.");
      return;
    }
    if (sourceMode === "plate" && plate.replace(/\s/g,"").length < 7) {
      setError("차량번호를 정확히 입력해 주세요.");
      return;
    }
    if (sourceMode === "manual" && (!manualMake.trim() || !manualModel.trim())) {
      setError("제조사와 모델을 입력해 주세요.");
      return;
    }
    setIsImporting(true);
    window.setTimeout(() => {
      setMedia(demoMedia);
      setListing({...defaultListing,plate:sourceMode==="plate"?plate:defaultListing.plate,title:sourceMode==="manual"?`${manualMake} ${manualModel}`:defaultListing.title});
      setHookText(sourceMode==="manual"?`한눈에 보는 ${manualMake} ${manualModel}`:"지금 놓치면 아쉬운 G63");
      setImported(true);
      setFactsConfirmed(false);
      setIsImporting(false);
    }, 650);
  };

  const publishVideo = () => {
    const targets = channels.filter((channel) => selectedChannels[channel.id]);
    if (!targets.length) { setPublishMessage("게시할 채널을 하나 이상 선택해 주세요."); return; }
    setPublishMessage("채널별 규격과 공개 상태를 확인하고 있어요.");
    const publishing = Object.fromEntries(targets.map((channel) => [channel.id,"publishing"])) as Partial<Record<ChannelId,ChannelStatus>>;
    setChannelStatuses((current) => ({...current,...publishing}));
    window.setTimeout(() => {
      const published = Object.fromEntries(targets.map((channel) => [channel.id,"published"])) as Partial<Record<ChannelId,ChannelStatus>>;
      setChannelStatuses((current) => ({...current,...published}));
      setPublishMessage(`${targets.length}개 채널 게시 준비가 완료됐습니다. 실제 서비스에서는 연결된 계정으로 게시됩니다.`);
    },1200);
  };

  const addFiles = (files:FileList | File[]) => {
    const allowed = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!allowed.length) {
      setError("JPG, PNG, WEBP 사진 파일을 선택해 주세요.");
      return;
    }
    const next = allowed.slice(0, Math.max(0, 12-media.length)).map((file,index) => ({
      id:`upload-${Date.now()}-${index}`,
      name:file.name,
      url:URL.createObjectURL(file),
      owned:true,
    }));
    setMedia((current) => [...current,...next]);
    setImported(false);
    setError("");
  };

  const onFileChange = (event:ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };
  const onDrop = (event:DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };
  const moveMedia = (index:number,direction:-1|1) => {
    const target = index+direction;
    if (target<0 || target>=media.length) return;
    setMedia((current) => {
      const next = [...current];
      [next[index],next[target]] = [next[target],next[index]];
      return next;
    });
    setCurrentMedia(0);
  };
  const removeMedia = (id:string) => {
    const target = media.find((item) => item.id===id);
    if (target?.owned) URL.revokeObjectURL(target.url);
    setMedia((current) => current.filter((item) => item.id!==id));
    setCurrentMedia(0);
  };

  const generateVideo = async () => {
    if (!media.length) return;
    setStep("export");
    setProgress(4);
    setStatus("사진을 고화질로 준비하고 있어요");
    setError("");
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = "";
    setVideoUrl("");
    try {
      const result = await renderVideo({ media,listing,accent,template,duration,hookText,music,onProgress:(value,label) => {
        setProgress(value);
        setStatus(label);
      }});
      videoUrlRef.current = result.url;
      setVideoUrl(result.url);
      setVideoExtension(result.extension);
      setProgress(100);
      setStatus("게시할 영상이 완성됐어요");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "영상 생성 중 문제가 발생했습니다.");
      setStatus("다시 시도해 주세요");
    }
  };

  const caption = useMemo(() => `${hookText}\n\n${listing.year}년식 ${listing.title}\n${listing.trim}\n주행 ${listing.mileage}km · ${listing.fuel}\n판매가 ${listing.price}만원\n\n실매물 상담 ${listing.dealer} ${listing.phone}\n#보배드림 #중고차 #${listing.title.split(" ")[0]}`, [listing,hookText]);
  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    setStatus("게시 문구를 복사했어요");
  };
  const previewVoice = () => {
    if (!("speechSynthesis" in window)) { setStatus("이 브라우저에서는 음성 미리듣기를 지원하지 않습니다."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${hookText}. ${listing.year}년식 ${listing.title}. 주행거리 ${listing.mileage}킬로미터. 판매가 ${listing.price}만원.`);
    utterance.lang = "ko-KR";
    utterance.rate = voice==="energetic"?1.08:.92;
    utterance.pitch = voice==="energetic"?1.05:.92;
    window.speechSynthesis.speak(utterance);
    setStatus("AI 나레이션을 미리 듣고 있어요");
  };

  return <div className="studio-shell">
    <header className="studio-header">
      <div className="studio-brand"><button type="button" aria-label="딜러 찾기로 돌아가기" onClick={() => window.location.assign("./")}>B</button><span><b>보배드림</b><em>딜러 스튜디오</em></span></div>
      <div className="studio-credits"><span>이번 달 무료 제작</span><strong>3 / 5</strong><button type="button">이용 안내</button></div>
    </header>

    <main className="studio-main">
      <section className="studio-title">
        <div><p>DEALER SHORTS STUDIO</p><h1>매물 사진으로 쇼츠를<br/>바로 만들어 보세요</h1><span>촬영과 편집 없이, 보배드림 매물 정보와 사진만 있으면 됩니다.</span></div>
        <div className="studio-benefits"><span>9:16 세로 영상</span><span>딜러 연락처 자동 삽입</span><span>3개 채널 게시 점검</span></div>
      </section>

      <nav className="studio-steps" aria-label="영상 제작 단계">
        <StepButton number="1" label="매물 가져오기" active={step==="source"} done={step!=="source"} onClick={() => setStep("source")} />
        <i />
        <StepButton number="2" label="영상 꾸미기" active={step==="design"} done={step==="export" || step==="publish"} disabled={!canContinue} onClick={() => setStep("design")} />
        <i />
        <StepButton number="3" label="완성·다운로드" active={step==="export"} done={Boolean(videoUrl)} disabled={!videoUrl && step!=="export"} onClick={() => setStep("export")} />
        <i />
        <StepButton number="4" label="게시·재고관리" active={step==="publish"} done={Object.values(channelStatuses).some((value) => value==="published")} disabled={!videoUrl} onClick={() => setStep("publish")} />
      </nav>

      {step === "source" ? <div className="studio-workspace source-grid">
        <section className="studio-card import-card">
          <div className="card-heading"><span className="heading-icon">↗</span><div><h2>차량 선택</h2><p>매물 URL, 차량번호, 직접선택 중 편한 방식으로 시작하세요.</p></div></div>
          <div className="source-mode-tabs">{(["url","plate","manual"] as SourceMode[]).map((mode) => <button type="button" key={mode} className={sourceMode===mode?"selected":""} onClick={() => {setSourceMode(mode);setError("");}}>{mode==="url"?"매물 URL":mode==="plate"?"차량번호":"직접선택"}</button>)}</div>
          {sourceMode==="url" ? <label className="url-field"><span>보배드림 매물 URL</span><div><input value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://www.bobaedream.co.kr/mycar/..."/><button type="button" onClick={importListing} disabled={isImporting}>{isImporting?"불러오는 중":"매물 불러오기"}</button></div></label> : null}
          {sourceMode==="plate" ? <label className="url-field"><span>차량번호</span><div><input value={plate} onChange={(event) => setPlate(event.target.value)} placeholder="123가4567"/><button type="button" onClick={importListing} disabled={isImporting}>{isImporting?"조회 중":"기본정보 조회"}</button></div><small>조회 결과는 후보값이며 게시 전 딜러가 직접 확인합니다.</small></label> : null}
          {sourceMode==="manual" ? <div className="manual-source"><StudioField label="제조사" value={manualMake} onChange={setManualMake}/><StudioField label="모델" value={manualModel} onChange={setManualModel}/><button type="button" onClick={importListing} disabled={isImporting}>{isImporting?"준비 중":"차량 직접 등록"}</button></div> : null}
          {imported ? <div className="import-success"><b>매물을 불러왔습니다</b><span>사진 {media.length}장과 차량 정보를 확인해 주세요.</span></div> : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="divider"><span>또는</span></div>
          <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if(event.key==="Enter") inputRef.current?.click(); }}>
            <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFileChange}/>
            <span className="upload-mark">＋</span><strong>직접 사진 올리기</strong><p>사진을 끌어다 놓거나 눌러서 선택 · 최대 12장</p>
          </div>
        </section>

        <section className="studio-card media-card">
          <div className="card-heading compact"><div><h2>사진 순서</h2><p>{media.length ? `${media.length}장 · 첫 사진이 영상의 시작 화면입니다.` : "매물 사진을 먼저 불러와 주세요."}</p></div><button className="text-action" type="button" onClick={() => inputRef.current?.click()}>사진 추가</button></div>
          {media.length ? <div className="media-list">{media.map((item,index) => <div className="media-row" key={item.id}>
            <span className="media-index">{index+1}</span><img src={item.url} alt=""/><span className="media-name">{item.name}</span>
            <div><button type="button" aria-label="앞으로 이동" disabled={index===0} onClick={() => moveMedia(index,-1)}>↑</button><button type="button" aria-label="뒤로 이동" disabled={index===media.length-1} onClick={() => moveMedia(index,1)}>↓</button><button type="button" aria-label="삭제" onClick={() => removeMedia(item.id)}>×</button></div>
          </div>)}</div> : <div className="media-empty"><span>사진을 가져오면<br/>여기에 순서대로 표시됩니다</span></div>}
          {media.length ? <div className="media-audit"><span className={media.length>=7?"pass":"warn"}>{media.length>=7?"✓":"!"} 최소 7장</span><span className="pass">✓ 대표사진</span><span className="pass">✓ 번호판 보호</span></div> : null}
        </section>

        <section className="studio-card detail-card">
          <div className="card-heading compact"><div><h2>차량 정보</h2><p>영상에 노출될 내용을 확인하고 수정하세요.</p></div></div>
          <div className="form-grid">
            <StudioField label="차량명" value={listing.title} onChange={(value) => updateListing("title",value)} wide />
            <StudioField label="세부 모델·특징" value={listing.trim} onChange={(value) => updateListing("trim",value)} wide />
            <StudioField label="연식" value={listing.year} onChange={(value) => updateListing("year",value)} />
            <StudioField label="주행거리(km)" value={listing.mileage} onChange={(value) => updateListing("mileage",value)} />
            <StudioField label="연료" value={listing.fuel} onChange={(value) => updateListing("fuel",value)} />
            <StudioField label="판매가(만원)" value={listing.price} onChange={(value) => updateListing("price",value)} />
            <StudioField label="사고 여부" value={listing.accident} onChange={(value) => updateListing("accident",value)} />
            <StudioField label="보증·점검" value={listing.warranty} onChange={(value) => updateListing("warranty",value)} />
          </div>
          <label className="fact-confirm"><input type="checkbox" checked={factsConfirmed} onChange={(event) => setFactsConfirmed(event.target.checked)}/><span><b>원본 매물과 동일한 정보임을 확인했습니다</b><small>가격·주행거리·사고 여부는 AI가 임의로 바꾸지 않으며, 게시 전 확인값으로 잠급니다.</small></span></label>
        </section>

        <div className="source-actions"><span>{canContinue?"영상에 사용할 준비가 끝났습니다.":"사진과 필수 차량 정보를 채워 주세요."}</span><button type="button" disabled={!canContinue} onClick={() => setStep("design")}>다음 · 영상 꾸미기</button></div>
      </div> : null}

      {step === "design" ? <div className="studio-workspace design-grid">
        <section className="phone-preview-wrap">
          <div className={`phone-preview template-${template}`} style={{"--studio-accent":accent} as React.CSSProperties}>
            <div className="preview-status"><b>보배드림</b><span>{previewChannel==="youtube"?"YouTube Shorts":previewChannel==="instagram"?"Instagram Reels":"TikTok"}</span></div>
            <img key={media[currentMedia]?.id} className="preview-car" src={media[currentMedia]?.url} alt="영상 미리보기"/>
            <div className="preview-shade" />
            <div className="preview-hook"><small>지금 볼 매물</small><b>{hookText}</b></div>
            <div className="preview-copy"><span>{listing.year}년식 · {listing.mileage}km</span><h2>{listing.title}</h2><p>{listing.trim}</p><strong>{listing.price}<small>만원</small></strong></div>
            <div className="preview-dealer"><span>{listing.company}</span><b>{listing.dealer} · {listing.phone}</b></div>
            <div className="preview-progress">{media.map((item,index) => <i className={index===currentMedia?"active":""} key={item.id}/>)}</div>
          </div>
          <div className="preview-platform-tabs">{channels.map((channel) => <button type="button" key={channel.id} className={previewChannel===channel.id?"selected":""} onClick={() => setPreviewChannel(channel.id)}>{channel.id==="youtube"?"Shorts":channel.id==="instagram"?"Reels":"TikTok"}</button>)}</div>
          <p>채널 안전영역을 확인하는 9:16 미리보기 · 실제 출력 720 × 1280</p>
        </section>

        <section className="design-controls">
          <div className="studio-card control-card"><div className="card-heading compact"><div><h2>영상 스타일</h2><p>매물 성격에 맞는 템플릿을 골라 주세요.</p></div></div>
            <div className="template-list">{templateOptions.map((item) => <button type="button" key={item.id} className={template===item.id?"selected":""} onClick={() => setTemplate(item.id)}><span className={`template-swatch ${item.id}`}><i/><i/><i/></span><b>{item.name}</b><small>{item.description}</small></button>)}</div>
          </div>
          <div className="studio-card control-card hook-card"><div className="card-heading compact"><div><h2>첫 2초 후킹 문구</h2><p>실제 자동차 숏폼처럼 차량의 한 가지 매력을 먼저 보여줍니다.</p></div><span className="trend-badge">조회 유도</span></div>
            <label className="hook-input"><span className="sr-only">후킹 문구</span><input maxLength={34} value={hookText} onChange={(event) => setHookText(event.target.value)}/><small>{hookText.length}/34</small></label>
            <div className="hook-suggestions">{hookSuggestions.map((hook) => <button type="button" key={hook} onClick={() => setHookText(hook)}>{hook}</button>)}</div>
          </div>
          <div className="studio-card control-card"><div className="card-heading compact"><div><h2>음성·BGM</h2><p>나레이션 톤을 미리 듣고, 결과 영상에 들어갈 BGM을 선택하세요.</p></div></div>
            <div className="sound-settings"><label><span>AI 나레이션</span><select value={voice} onChange={(event) => setVoice(event.target.value as VoiceId)}><option value="energetic">활기찬 딜러</option><option value="calm">차분한 안내</option></select></label><button type="button" onClick={previewVoice}>음성 미리듣기</button><label><span>배경음악</span><select value={music} onChange={(event) => setMusic(event.target.value as MusicId)}><option value="drive">Drive · 경쾌함</option><option value="luxury">Luxury · 고급스러움</option><option value="none">음악 없음</option></select></label></div>
            <small className="sound-note">BGM은 다운로드 영상에 포함됩니다. AI 음성은 브라우저 미리듣기이며 정식 TTS 연동 전에는 영상에 삽입되지 않습니다.</small>
          </div>
          <div className="studio-card control-card"><div className="card-heading compact"><div><h2>브랜드 설정</h2><p>딜러명과 포인트 색상을 모든 장면에 적용합니다.</p></div></div>
            <div className="brand-fields"><StudioField label="상사명" value={listing.company} onChange={(value) => updateListing("company",value)}/><StudioField label="딜러명" value={listing.dealer} onChange={(value) => updateListing("dealer",value)}/><StudioField label="연락처" value={listing.phone} onChange={(value) => updateListing("phone",value)} wide /></div>
            <label className="color-picker"><span>포인트 색상</span><div><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)}/>{["#e11d2e","#2563eb","#111827","#f59e0b"].map((color) => <button type="button" key={color} style={{background:color}} aria-label={`${color} 색상`} className={accent===color?"selected":""} onClick={() => setAccent(color)}/>)}</div></label>
          </div>
          <div className="studio-card control-card"><div className="card-heading compact"><div><h2>영상 길이</h2><p>SNS 채널에 맞춰 템포를 선택하세요.</p></div></div>
            <div className="duration-options">{[15,30,45].map((value) => <button type="button" className={duration===value?"selected":""} onClick={() => setDuration(value)} key={value}><b>{value}초</b><span>{value===15?"추천":value===30?"상세하게":"차량 전체"}</span></button>)}</div>
          </div>
          <div className="design-actions"><button type="button" className="secondary-action" onClick={() => setStep("source")}>이전</button><button type="button" className="primary-action" onClick={generateVideo}>영상 만들기 <span>약 {duration}초</span></button></div>
        </section>
      </div> : null}

      {step === "export" ? <div className="studio-workspace export-grid">
        <section className="result-card">
          {videoUrl ? <><div className="result-check">✓</div><p>영상 제작 완료</p><h2>{listing.title} 숏폼이 준비됐습니다</h2><video src={videoUrl} controls playsInline/><a className="download-button" href={videoUrl} download={`보배드림_${listing.title.replace(/\s+/g,"_")}.${videoExtension}`}>영상 다운로드 <span>{videoExtension.toUpperCase()}</span></a><button type="button" className="publish-next" onClick={() => setStep("publish")}>다음 · 3개 채널 게시 점검</button><button type="button" className="secondary-wide" onClick={() => setStep("design")}>디자인 다시 수정하기</button></> : <div className="rendering"><div className="render-ring" style={{"--progress":`${progress*3.6}deg`} as React.CSSProperties}><span>{progress}%</span></div><p>영상 제작 중</p><h2>{status}</h2><div className="render-bar"><i style={{width:`${progress}%`}}/></div><small>이 창을 닫지 마세요. 브라우저에서 안전하게 처리하고 있습니다.</small>{error ? <><p className="form-error">{error}</p><button type="button" className="primary-action" onClick={generateVideo}>다시 시도</button></> : null}</div>}
        </section>
        <aside className="publish-card"><span>게시 준비도 함께 끝내세요</span><h2>SNS 게시 문구</h2><textarea readOnly value={caption}/><button type="button" onClick={copyCaption}>게시 문구 복사</button><div><b>추천 채널</b><span>인스타그램 릴스</span><span>유튜브 쇼츠</span><span>네이버 클립</span></div></aside>
      </div> : null}

      {step === "publish" ? <div className="studio-workspace publish-grid">
        <section className="studio-card publish-console">
          <div className="card-heading compact"><div><span className="eyebrow">CHANNEL DELIVERY</span><h2>채널별 게시 점검</h2><p>한 채널이 실패해도 나머지 채널은 그대로 진행하고 개별 재시도합니다.</p></div><span className="prototype-badge">연결 데모</span></div>
          <div className="channel-list">{channels.map((channel) => {
            const channelStatus=channelStatuses[channel.id];
            return <label className={selectedChannels[channel.id]?"channel-row selected":"channel-row"} key={channel.id}><input type="checkbox" checked={selectedChannels[channel.id]} onChange={(event) => setSelectedChannels((current) => ({...current,[channel.id]:event.target.checked}))}/><span className={`channel-logo ${channel.id}`}>{channel.id==="youtube"?"▶":channel.id==="instagram"?"◎":"♪"}</span><span className="channel-copy"><b>{channel.name}</b><small>{channel.note}</small></span><em className={`channel-status ${channelStatus}`}>{channelStatus==="ready"?"준비됨":channelStatus==="publishing"?"점검 중":channelStatus==="published"?"게시 준비 완료":"재시도 필요"}</em></label>;
          })}</div>
          <div className="publish-options"><label><span>게시 시간</span><select><option>지금 게시</option><option>오늘 오후 8:00</option><option>내일 오전 9:00</option></select></label><label><span>공개 범위</span><select><option>전체 공개</option><option>일부 공개</option><option>비공개 검수</option></select></label></div>
          {publishMessage ? <p className="publish-message" role="status">{publishMessage}</p> : null}
          <button type="button" className="primary-action publish-run" onClick={publishVideo}>선택 채널 게시 점검</button>
          <small className="connection-note">프로토타입에서는 게시 규격과 상태 흐름을 검증합니다. 실제 게시에는 각 플랫폼 OAuth와 앱 심사가 필요합니다.</small>
        </section>

        <aside className="studio-card inventory-card">
          <span className="eyebrow">INVENTORY SYNC</span><h2>매물 상태 연동</h2><div className="inventory-vehicle"><img src={media[0]?.url} alt=""/><span><b>{listing.title}</b><small>{listing.plate} · {listing.price}만원</small></span></div>
          <div className={`inventory-state ${inventoryStatus}`}><span>{inventoryStatus==="active"?"판매중":inventoryStatus==="price-changed"?"가격 변경 감지":"판매 완료"}</span><b>{inventoryStatus==="active"?"게시 유지":inventoryStatus==="price-changed"?"오버레이 재생성 필요":"외부 게시 중단 예약"}</b></div>
          <div className="inventory-actions"><button type="button" onClick={() => setInventoryStatus("price-changed")}>가격변경 테스트</button><button type="button" onClick={() => setInventoryStatus("sold")}>판매완료 처리</button><button type="button" onClick={() => setInventoryStatus("active")}>판매중 복원</button></div>
          <p>가격이 바뀌면 재생성 여부를 묻고, 판매 완료 시 게시 링크를 중단하거나 유사 매물로 연결합니다.</p>
        </aside>
      </div> : null}
    </main>
  </div>;
}

function StepButton({number,label,active,done,disabled,onClick}:{number:string;label:string;active:boolean;done:boolean;disabled?:boolean;onClick:()=>void}) {
  return <button type="button" className={active?"active":done?"done":""} disabled={disabled} onClick={onClick}><span>{done?"✓":number}</span><b>{label}</b></button>;
}

function StudioField({label,value,onChange,wide=false}:{label:string;value:string;onChange:(value:string)=>void;wide?:boolean}) {
  return <label className={wide?"studio-field wide":"studio-field"}><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)}/></label>;
}

async function renderVideo({media,listing,accent,template,duration,hookText,music,onProgress}:{media:MediaItem[];listing:typeof defaultListing;accent:string;template:TemplateId;duration:number;hookText:string;music:MusicId;onProgress:(value:number,label:string)=>void}) {
  if (!window.MediaRecorder) throw new Error("이 브라우저는 영상 생성을 지원하지 않습니다. 최신 Chrome 또는 Edge를 이용해 주세요.");
  let audioContext:AudioContext | null = null;
  if (music!=="none" && window.AudioContext) {
    try {
      audioContext = new AudioContext();
      await audioContext.resume();
    } catch {
      audioContext = null;
    }
  }
  const images = await Promise.all(media.slice(0,8).map(loadImage));
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("영상 캔버스를 준비하지 못했습니다.");
  const canvasStream = canvas.captureStream(30);
  if (!canvasStream.getVideoTracks().length) throw new Error("영상 트랙을 만들지 못했습니다. Chrome 또는 Edge에서 다시 시도해 주세요.");
  let stopMusic:(()=>void) | null = null;
  let stream = canvasStream;
  if (audioContext) {
    const audioDestination = audioContext.createMediaStreamDestination();
    stopMusic = scheduleMusicBed(audioContext,audioDestination,music,duration);
    stream = new MediaStream([...canvasStream.getVideoTracks(),...audioDestination.stream.getAudioTracks()]);
  }
  const candidates = audioContext
    ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]
    : ["video/mp4;codecs=avc1.42E01E","video/webm;codecs=vp9","video/webm;codecs=vp8","video/mp4","video/webm"];
  let recorder:MediaRecorder | null = null;
  let mimeType = "";
  for (const candidate of candidates) {
    if (!MediaRecorder.isTypeSupported(candidate)) continue;
    try {
      recorder = new MediaRecorder(stream,{mimeType:candidate,videoBitsPerSecond:5_000_000});
      mimeType = candidate;
      break;
    } catch {
      // Some browsers report a codec as supported but still reject it at construction time.
    }
  }
  if (!recorder || !mimeType) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("지원되는 영상 인코더를 찾지 못했습니다. Chrome 또는 Edge에서 다시 시도해 주세요.");
  }
  const chunks:Blob[] = [];
  recorder.ondataavailable = (event) => { if(event.data.size) chunks.push(event.data); };
  const complete = new Promise<Blob>((resolve,reject) => {
    recorder!.onstop = () => resolve(new Blob(chunks,{type:mimeType}));
    recorder!.onerror = () => reject(new Error("영상 인코딩에 실패했습니다."));
  });
  const total = Math.max(6,duration)*1000;
  const frameDuration = total/images.length;
  drawVideoFrame(context,canvas,images[0],listing,accent,template,hookText,0,images.length,0);
  recorder.start(500);
  const started = performance.now();
  onProgress(12,"장면을 구성하고 있어요");
  await new Promise<void>((resolve) => {
    const draw = (now:number) => {
      const elapsed = Math.min(now-started,total);
      const index = Math.min(images.length-1,Math.floor(elapsed/frameDuration));
      const local = (elapsed%frameDuration)/frameDuration;
      drawVideoFrame(context,canvas,images[index],listing,accent,template,hookText,index,images.length,local);
      const value = Math.min(92,12+Math.round((elapsed/total)*80));
      onProgress(value,value<55?"차량 정보와 가격을 넣고 있어요":"세로형 영상으로 인코딩하고 있어요");
      if (elapsed<total) requestAnimationFrame(draw); else resolve();
    };
    requestAnimationFrame(draw);
  });
  onProgress(94,"영상 파일을 마무리하고 있어요");
  if (recorder.state === "recording") recorder.requestData();
  await new Promise((resolve) => window.setTimeout(resolve,180));
  if (recorder.state !== "inactive") recorder.stop();
  const blob = await Promise.race([
    complete,
    new Promise<never>((_,reject) => window.setTimeout(() => reject(new Error("영상 파일 마무리가 지연되고 있습니다. 다시 시도해 주세요.")),8000)),
  ]);
  stream.getTracks().forEach((track) => track.stop());
  stopMusic?.();
  if (audioContext && audioContext.state!=="closed") await audioContext.close();
  if (blob.size < 1024) throw new Error("영상 파일이 완성되지 않았습니다. 다시 시도해 주세요.");
  const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
  return { url:URL.createObjectURL(blob), extension };
}

function loadImage(item:MediaItem) {
  return new Promise<HTMLImageElement>((resolve,reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`${item.name} 사진을 읽지 못했습니다.`));
    image.src = item.url;
  });
}

function scheduleMusicBed(context:AudioContext,destination:MediaStreamAudioDestinationNode,music:MusicId,duration:number) {
  const master = context.createGain();
  master.gain.value = music==="luxury"?.035:.045;
  master.connect(destination);
  const roots = music==="luxury"?[110,138.59,164.81,220]:[130.81,164.81,196,261.63];
  const oscillators:OscillatorNode[] = [];
  const start = context.currentTime+.05;
  for(let beat=0;beat<duration;beat+=1.5) {
    const root = roots[Math.floor(beat/1.5)%roots.length];
    [1,1.5,2].forEach((ratio,voiceIndex) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = music==="luxury"?"sine":"triangle";
      oscillator.frequency.value = root*ratio;
      gain.gain.setValueAtTime(0,start+beat);
      gain.gain.linearRampToValueAtTime(voiceIndex===0?.32:.12,start+beat+.12);
      gain.gain.exponentialRampToValueAtTime(.001,start+Math.min(duration,beat+1.38));
      oscillator.connect(gain).connect(master);
      oscillator.start(start+beat);
      oscillator.stop(start+Math.min(duration,beat+1.45));
      oscillators.push(oscillator);
    });
  }
  return () => {
    oscillators.forEach((oscillator) => { try { oscillator.disconnect(); } catch { /* already stopped */ } });
    master.disconnect();
  };
}

function drawVideoFrame(context:CanvasRenderingContext2D,canvas:HTMLCanvasElement,image:HTMLImageElement,listing:typeof defaultListing,accent:string,template:TemplateId,hookText:string,index:number,total:number,progress:number) {
  const zoom = 1.04+progress*0.06;
  const scale = Math.max(canvas.width/image.width,canvas.height/image.height)*zoom;
  const width = image.width*scale;
  const height = image.height*scale;
  context.fillStyle = "#0b0d12";
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
  const gradient = context.createLinearGradient(0,520,0,1280);
  gradient.addColorStop(0,"rgba(0,0,0,0)");
  gradient.addColorStop(.55,"rgba(0,0,0,.18)");
  gradient.addColorStop(1,"rgba(0,0,0,.9)");
  context.fillStyle = gradient;
  context.fillRect(0,0,720,1280);
  context.fillStyle = accent;
  context.fillRect(48,56,template==="performance"?196:150,44);
  context.fillStyle = "white";
  context.font = "700 22px Arial,sans-serif";
  context.fillText("BOBAEDREAM",62,86);
  if(index===0 || template==="reviewer") {
    context.fillStyle = template==="reviewer"?"rgba(10,12,16,.84)":"rgba(10,12,16,.68)";
    context.fillRect(48,730,624,112);
    context.fillStyle = accent;
    context.fillRect(48,730,9,112);
    context.fillStyle = "white";
    context.font = "900 38px Arial,sans-serif";
    context.fillText(hookText.slice(0,24),78,797,560);
    context.font = "700 18px Arial,sans-serif";
    context.fillStyle = "rgba(255,255,255,.72)";
    context.fillText("2초 만에 핵심만 확인하세요",78,824);
  }
  context.font = "600 24px Arial,sans-serif";
  context.fillText(`${listing.year}년식 · ${listing.mileage}km`,52,908);
  context.font = "800 46px Arial,sans-serif";
  context.fillText(listing.title.slice(0,24),52,968);
  context.font = "500 25px Arial,sans-serif";
  context.fillStyle = "rgba(255,255,255,.8)";
  context.fillText(listing.trim.slice(0,32),52,1010);
  context.fillStyle = "white";
  context.font = "900 66px Arial,sans-serif";
  context.fillText(`${listing.price}만원`,52,1092);
  context.fillStyle = accent;
  context.fillRect(0,1160,720,120);
  context.fillStyle = "white";
  context.font = "700 25px Arial,sans-serif";
  context.fillText(`${listing.company}  ${listing.dealer}`,48,1210);
  context.font = "600 22px Arial,sans-serif";
  context.fillText(listing.phone,48,1247);
  const segment = 620/total;
  for(let item=0;item<total;item++) {
    context.fillStyle = item===index ? "white" : "rgba(255,255,255,.4)";
    context.fillRect(50+item*segment,1128,Math.max(8,segment-8),6);
  }
}
