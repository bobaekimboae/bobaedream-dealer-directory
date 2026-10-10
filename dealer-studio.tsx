import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type Step = "source" | "design" | "export";
type TemplateId = "signature" | "clean" | "performance";
type MediaItem = { id:string; name:string; url:string; owned?:boolean };

const demoMedia:MediaItem[] = [
  { id:"demo-1", name:"전면", url:`${import.meta.env.BASE_URL}demo-car/car-front.jpeg` },
  { id:"demo-2", name:"정측면", url:`${import.meta.env.BASE_URL}demo-car/car-angle.png` },
  { id:"demo-3", name:"실내", url:`${import.meta.env.BASE_URL}demo-car/car-detail.jpeg` },
  { id:"demo-4", name:"후면", url:`${import.meta.env.BASE_URL}demo-car/car-rear.jpeg` },
];

const templateOptions:Array<{ id:TemplateId; name:string; description:string }> = [
  { id:"signature", name:"시그니처", description:"브랜드와 가격을 또렷하게" },
  { id:"clean", name:"클린", description:"사진이 돋보이는 미니멀 구성" },
  { id:"performance", name:"퍼포먼스", description:"빠른 전환과 강한 스펙 강조" },
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
};

export function DealerStudio() {
  const [step,setStep] = useState<Step>("source");
  const [listingUrl,setListingUrl] = useState("https://www.bobaedream.co.kr/mycar/mycar_view.php?no=2250479");
  const [isImporting,setIsImporting] = useState(false);
  const [imported,setImported] = useState(false);
  const [media,setMedia] = useState<MediaItem[]>([]);
  const [listing,setListing] = useState(defaultListing);
  const [template,setTemplate] = useState<TemplateId>("signature");
  const [accent,setAccent] = useState("#e11d2e");
  const [duration,setDuration] = useState(15);
  const [currentMedia,setCurrentMedia] = useState(0);
  const [progress,setProgress] = useState(0);
  const [status,setStatus] = useState("대기 중");
  const [videoUrl,setVideoUrl] = useState("");
  const [videoExtension,setVideoExtension] = useState("webm");
  const [error,setError] = useState("");
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

  const canContinue = media.length > 0 && listing.title.trim() && listing.price.trim();
  const updateListing = (key:keyof typeof listing, value:string) => setListing((current) => ({...current,[key]:value}));

  const importListing = () => {
    setError("");
    if (!listingUrl.includes("bobaedream.co.kr")) {
      setError("보배드림 매물 URL을 입력해 주세요.");
      return;
    }
    setIsImporting(true);
    window.setTimeout(() => {
      setMedia(demoMedia);
      setListing(defaultListing);
      setImported(true);
      setIsImporting(false);
    }, 650);
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
      const result = await renderVideo({ media,listing,accent,template,duration,onProgress:(value,label) => {
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

  const caption = useMemo(() => `${listing.year}년식 ${listing.title}\n${listing.trim}\n주행 ${listing.mileage}km · ${listing.fuel}\n판매가 ${listing.price}만원\n\n실매물 상담 ${listing.dealer} ${listing.phone}\n#보배드림 #중고차 #${listing.title.split(" ")[0]}`, [listing]);
  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    setStatus("게시 문구를 복사했어요");
  };

  return <div className="studio-shell">
    <header className="studio-header">
      <div className="studio-brand"><button type="button" aria-label="딜러 찾기로 돌아가기" onClick={() => window.location.assign("./")}>B</button><span><b>보배드림</b><em>딜러 스튜디오</em></span></div>
      <div className="studio-credits"><span>이번 달 무료 제작</span><strong>3 / 5</strong><button type="button">이용 안내</button></div>
    </header>

    <main className="studio-main">
      <section className="studio-title">
        <div><p>DEALER SHORTS STUDIO</p><h1>매물 사진으로 쇼츠를<br/>바로 만들어 보세요</h1><span>촬영과 편집 없이, 보배드림 매물 정보와 사진만 있으면 됩니다.</span></div>
        <div className="studio-benefits"><span>9:16 세로 영상</span><span>딜러 연락처 자동 삽입</span><span>SNS 게시 문구 제공</span></div>
      </section>

      <nav className="studio-steps" aria-label="영상 제작 단계">
        <StepButton number="1" label="매물 가져오기" active={step==="source"} done={step!=="source"} onClick={() => setStep("source")} />
        <i />
        <StepButton number="2" label="영상 꾸미기" active={step==="design"} done={step==="export"} disabled={!canContinue} onClick={() => setStep("design")} />
        <i />
        <StepButton number="3" label="완성·다운로드" active={step==="export"} done={Boolean(videoUrl)} disabled={!videoUrl && step!=="export"} onClick={() => setStep("export")} />
      </nav>

      {step === "source" ? <div className="studio-workspace source-grid">
        <section className="studio-card import-card">
          <div className="card-heading"><span className="heading-icon">↗</span><div><h2>보배드림 매물 불러오기</h2><p>매물 URL을 붙여 넣으면 사진과 차량 정보를 자동으로 채웁니다.</p></div></div>
          <label className="url-field"><span>매물 URL</span><div><input value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://www.bobaedream.co.kr/mycar/..."/><button type="button" onClick={importListing} disabled={isImporting}>{isImporting?"불러오는 중":"매물 불러오기"}</button></div></label>
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
          </div>
        </section>

        <div className="source-actions"><span>{canContinue?"영상에 사용할 준비가 끝났습니다.":"사진과 필수 차량 정보를 채워 주세요."}</span><button type="button" disabled={!canContinue} onClick={() => setStep("design")}>다음 · 영상 꾸미기</button></div>
      </div> : null}

      {step === "design" ? <div className="studio-workspace design-grid">
        <section className="phone-preview-wrap">
          <div className={`phone-preview template-${template}`} style={{"--studio-accent":accent} as React.CSSProperties}>
            <div className="preview-status"><b>보배드림</b><span>매물 숏폼</span></div>
            <img key={media[currentMedia]?.id} className="preview-car" src={media[currentMedia]?.url} alt="영상 미리보기"/>
            <div className="preview-shade" />
            <div className="preview-copy"><span>{listing.year}년식 · {listing.mileage}km</span><h2>{listing.title}</h2><p>{listing.trim}</p><strong>{listing.price}<small>만원</small></strong></div>
            <div className="preview-dealer"><span>{listing.company}</span><b>{listing.dealer} · {listing.phone}</b></div>
            <div className="preview-progress">{media.map((item,index) => <i className={index===currentMedia?"active":""} key={item.id}/>)}</div>
          </div>
          <p>미리보기는 자동으로 재생됩니다 · 실제 결과물 1080 × 1920</p>
        </section>

        <section className="design-controls">
          <div className="studio-card control-card"><div className="card-heading compact"><div><h2>영상 스타일</h2><p>매물 성격에 맞는 템플릿을 골라 주세요.</p></div></div>
            <div className="template-list">{templateOptions.map((item) => <button type="button" key={item.id} className={template===item.id?"selected":""} onClick={() => setTemplate(item.id)}><span className={`template-swatch ${item.id}`}><i/><i/><i/></span><b>{item.name}</b><small>{item.description}</small></button>)}</div>
          </div>
          <div className="studio-card control-card"><div className="card-heading compact"><div><h2>브랜드 설정</h2><p>딜러명과 포인트 색상을 모든 장면에 적용합니다.</p></div></div>
            <div className="brand-fields"><StudioField label="상사명" value={listing.company} onChange={(value) => updateListing("company",value)}/><StudioField label="딜러명" value={listing.dealer} onChange={(value) => updateListing("dealer",value)}/><StudioField label="연락처" value={listing.phone} onChange={(value) => updateListing("phone",value)} wide /></div>
            <label className="color-picker"><span>포인트 색상</span><div><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)}/>{["#e11d2e","#2563eb","#111827","#f59e0b"].map((color) => <button type="button" key={color} style={{background:color}} aria-label={`${color} 색상`} className={accent===color?"selected":""} onClick={() => setAccent(color)}/>)}</div></label>
          </div>
          <div className="studio-card control-card"><div className="card-heading compact"><div><h2>영상 길이</h2><p>SNS 채널에 맞춰 템포를 선택하세요.</p></div></div>
            <div className="duration-options">{[12,15,20].map((value) => <button type="button" className={duration===value?"selected":""} onClick={() => setDuration(value)} key={value}><b>{value}초</b><span>{value===12?"빠르게":value===15?"추천":"여유롭게"}</span></button>)}</div>
          </div>
          <div className="design-actions"><button type="button" className="secondary-action" onClick={() => setStep("source")}>이전</button><button type="button" className="primary-action" onClick={generateVideo}>영상 만들기 <span>약 {duration}초</span></button></div>
        </section>
      </div> : null}

      {step === "export" ? <div className="studio-workspace export-grid">
        <section className="result-card">
          {videoUrl ? <><div className="result-check">✓</div><p>영상 제작 완료</p><h2>{listing.title} 숏폼이 준비됐습니다</h2><video src={videoUrl} controls playsInline/><a className="download-button" href={videoUrl} download={`보배드림_${listing.title.replace(/\s+/g,"_")}.${videoExtension}`}>영상 다운로드 <span>{videoExtension.toUpperCase()}</span></a><button type="button" className="secondary-wide" onClick={() => setStep("design")}>디자인 다시 수정하기</button></> : <div className="rendering"><div className="render-ring" style={{"--progress":`${progress*3.6}deg`} as React.CSSProperties}><span>{progress}%</span></div><p>영상 제작 중</p><h2>{status}</h2><div className="render-bar"><i style={{width:`${progress}%`}}/></div><small>이 창을 닫지 마세요. 브라우저에서 안전하게 처리하고 있습니다.</small>{error ? <><p className="form-error">{error}</p><button type="button" className="primary-action" onClick={generateVideo}>다시 시도</button></> : null}</div>}
        </section>
        <aside className="publish-card"><span>게시 준비도 함께 끝내세요</span><h2>SNS 게시 문구</h2><textarea readOnly value={caption}/><button type="button" onClick={copyCaption}>게시 문구 복사</button><div><b>추천 채널</b><span>인스타그램 릴스</span><span>유튜브 쇼츠</span><span>네이버 클립</span></div></aside>
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

async function renderVideo({media,listing,accent,template,duration,onProgress}:{media:MediaItem[];listing:typeof defaultListing;accent:string;template:TemplateId;duration:number;onProgress:(value:number,label:string)=>void}) {
  if (!window.MediaRecorder) throw new Error("이 브라우저는 영상 생성을 지원하지 않습니다. 최신 Chrome 또는 Edge를 이용해 주세요.");
  const images = await Promise.all(media.slice(0,8).map(loadImage));
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("영상 캔버스를 준비하지 못했습니다.");
  const stream = canvas.captureStream(30);
  if (!stream.getVideoTracks().length) throw new Error("영상 트랙을 만들지 못했습니다. Chrome 또는 Edge에서 다시 시도해 주세요.");
  const candidates = ["video/mp4;codecs=avc1.42E01E","video/webm;codecs=vp9","video/webm;codecs=vp8","video/mp4","video/webm"];
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
  drawVideoFrame(context,canvas,images[0],listing,accent,template,0,images.length,0);
  recorder.start(500);
  const started = performance.now();
  onProgress(12,"장면을 구성하고 있어요");
  await new Promise<void>((resolve) => {
    const draw = (now:number) => {
      const elapsed = Math.min(now-started,total);
      const index = Math.min(images.length-1,Math.floor(elapsed/frameDuration));
      const local = (elapsed%frameDuration)/frameDuration;
      drawVideoFrame(context,canvas,images[index],listing,accent,template,index,images.length,local);
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

function drawVideoFrame(context:CanvasRenderingContext2D,canvas:HTMLCanvasElement,image:HTMLImageElement,listing:typeof defaultListing,accent:string,template:TemplateId,index:number,total:number,progress:number) {
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
