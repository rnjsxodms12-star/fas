# IMMA 실험 설계와 시행착오 이력 README

작성일: 2026-05-15  
대상 폴더: `C:\Users\user\Desktop\지능형zip`

## 1. 이 README의 목적

이 문서는 폴더 안에 남아 있는 파일 생성 순서, 압축파일 내부 문서, 최신 프로젝트 코드, 디버그 리포트, QC 메모를 읽고 IMMA 프로젝트가 어떤 고민과 시행착오를 거쳐 현재 형태까지 왔는지 발표용으로 재구성한 기록이다.

이전의 `파일_생성_연대기_정리_20260515.md`가 "언제 어떤 파일이 생겼는가"를 정리했다면, 이 README는 "왜 그런 파일들이 생겼고, 어떤 문제를 풀려고 했는가"를 설명한다.

분석 기준은 다음과 같다.

- 전체 265개 파일의 생성 시각, 경로, 확장자, 압축 내부 목록을 확인했다.
- 텍스트, Markdown, JSON, YAML, Python, HTML, JS, CSS 등 내용 독해가 가능한 파일을 중심으로 읽었다.
- 이미지, 모델 체크포인트, 대용량 바이너리 파일은 직접 문장으로 읽을 수 없으므로 파일명, 폴더 위치, 동반 설명 문서, QC 메모를 근거로 해석했다.
- Windows `CreationTime` 기준이므로 실제 개발 시점이 아니라 복사, 다운로드, 압축 해제 시점이 반영되었을 가능성이 있다.

## 2. 한 줄 요약

IMMA는 처음에는 클라이언트, 가공업체, 관리자 3자 흐름을 정리한 서비스 기획에서 출발했고, 이후 도면 업로드와 AI 분석, RAG/GraphRAG 기반 매칭, FastAPI 백엔드, 역할별 UI, Replicate 기반 VLM 배포, Path B 및 Donut/YOLO 기반 대안 아키텍처, Railway 배포와 QC 검증까지 확장되었다. 핵심 시행착오는 "기능 범위를 어디까지 데모에 넣을 것인가", "AI 도면 인식의 불확실성을 어떻게 보완할 것인가", "무거운 VLM을 비용과 안정성 안에서 어떻게 배포할 것인가", "데모 UI와 실제 API 흐름을 어떻게 충돌 없이 연결할 것인가"였다.

## 3. 시간순으로 본 설계 고민과 변화

### 2026-04-21: 3자 역할과 서비스 흐름의 초안

가장 이른 파일인 `(구)지능형zip\20260421.zip`에는 `클라이언트 토탈.txt`, `가공업체토탈.txt`, `관리자토탈.txt`가 들어 있다.

이 단계의 핵심 고민은 서비스를 단순 견적 요청 도구가 아니라 발주, 생산, 납품, 리뷰까지 이어지는 제조 거래 흐름으로 볼 것인지였다.

- 클라이언트는 도면, 납기, 수량, 수령 방식, 예산, 후처리, 품질 인증 요구를 입력한다.
- 가공업체는 역량, 장비, 스케줄, 수주 가능 상태를 제공하고 오더를 수락한다.
- 관리자는 클라이언트와 업체 사이에서 AI 분석, 정보 보완 요청, 업체 선별, 계약, 납품 확인, 리뷰 DB를 관리한다.

이 시점부터 이미 `도면 누락 치수 보완`, `업체 리뷰`, `작업 진행도 공유`, `납품 이미지`, `계약/결제 대행` 같은 후속 기능이 등장한다. 즉, 초기 설계의 방향은 "도면 업로드 후 업체 추천"보다 훨씬 넓은 거래 운영 플랫폼에 가까웠다.

### 2026-04-23: 발표/영상 스토리와 메시지 정리

`영상편집_이전_대화_필수.zip`에는 발표 영상의 흐름과 이미지 배치 고민이 남아 있다.

여기서는 기술 구현보다 "서비스가 왜 필요한지, 어떤 사회/산업적 문제와 연결되는지"를 보여주는 방식이 고민되었다.

- 0초~1분 10초 도입부
- 1분 10초~2분 30초 서비스 설명
- 중후반 파급효과 강조
- 정부 정책 한계와 서비스의 시너지 설명
- 어떤 이미지가 어느 구간에 들어가야 하는지 정리

즉, 이 단계는 구현보다 발표 내러티브를 설계한 흔적이다. 파일명에 `모름.png`, `모름2.png`가 남아 있는 것도 자료 배치가 아직 확정되지 않았음을 보여준다.

### 2026-04-27~04-29: DB 시드와 초기 클라이언트/서버 형태

`imma_seed_csv.zip`, `imma_client_v1.zip`, `imma_clientv2_최종0429.zip` 단계에서는 실행 가능한 초기 프로젝트 골격이 생겼다.

초기 `readme.md`에는 다음 구분이 남아 있다.

- `main.py`: Railway 운영 버전
- `server.py`: 로컬 Docker/UI 버전
- Docker 실행 메모: `docker run -p 8000:8000 imma-api`

이 시기의 고민은 "로컬에서 보는 데모"와 "배포 가능한 서버"를 분리하는 것이었다. 발표용으로 보이기만 하는 UI가 아니라, Railway 같은 배포 환경에서 FastAPI 서버를 올리는 방향이 이미 잡혀 있었다.

### 2026-04-30: RAG/파이프라인 설계

`RAG-20260430T111257Z-3-001.zip`에는 `Phase1_Pipeline.md`와 파이프라인 섹션 문서들이 들어 있다.

이 단계에서 도면 분석과 매칭 로직이 구조화되었다.

```text
도면 업로드 + 견적 요청 입력
→ VLM 추출
→ VLM JSON 파싱 + rfq_parts 생성
→ 매칭 필드 추출 + 재질 alias 해소
→ 하드필터 + 장비 검증
→ 후보 업체 목록 반환
```

중요한 시행착오는 VLM이 모든 것을 직접 결정하게 두지 않고, VLM 결과를 `parts[]`로 파싱한 뒤 DB, 표준, 장비 검증, 재질 alias 해소와 결합한 점이다. 이 설계는 이후 GraphRAG와 매칭 이력 저장으로 이어진다.

또한 문서에 `file_sha256`이 현재 VLM JSON 기반 해시이며 원본 도면 파일 해시로 교체해야 한다는 TODO가 남아 있다. 이는 초기 파이프라인이 실제 운영 안정성까지는 아직 정리 중이었다는 단서다.

### 2026-05-02~05-08: 기능 범위가 커지고, 동시에 줄이는 판단이 시작됨

`imma_project_3창.zip`, `fas_analysis.zip`, `imma_project_0506~0508` 계열 파일들은 기능이 빠르게 늘어난 구간이다. `main.py백업용폴더`에는 `기존main.py백업본.txt`부터 `main.py백업본16.txt`까지 남아 있어, 단일 서버 파일이 여러 차례 수정되었음을 보여준다.

이 시기의 핵심은 "무엇을 구현할 것인가"뿐 아니라 "무엇을 데모 범위에서 제외할 것인가"였다. `틀\기준점.txt`에는 최종 구현 목록과 제외 항목이 함께 정리되어 있다.

구현 대상으로 남긴 항목:

- 로그인/JWT
- 도면 업로드
- 매칭 이력 저장
- 업체 수락/거절
- 견적 비교
- 발주 확정
- RFQ/Order 상태 전이
- 알림
- 관리자 승인/반려
- 가공 진행도
- 도면 접근 권한
- 보완 요청 루프
- 주간 용량 캘린더
- 업체/RFQ 단건 조회
- 납품 이미지
- 배송 정보

반대로 데모 범위 밖으로 판단한 항목:

- 결제/정산 API
- 알림 설정 토글
- 휴무 등록
- AS 문의 티켓
- 통계 집계
- 메시지/대화
- 검수/QC 체크리스트

이 결정은 발표 완성도를 위해 중요한 분기였다. 실서비스에는 필요하지만 데모에서는 리스크가 큰 기능을 과감히 뒤로 미룬 것이다.

### 2026-05-10~05-11: 백엔드가 본격적으로 제품 구조가 됨

최신 추출 프로젝트의 `fas-main\구현_계획서.md`와 실제 코드 구조를 보면, 기존 단일 `main.py`는 FastAPI `APIRouter` 기반으로 분리되었다.

최신 구조의 특징:

- `main.py`는 앱 생성, UI 정적 파일 서빙, 라우터 include만 담당한다.
- `routers/`에는 인증, 회원가입, 업체, RFQ, 매칭, 발주, 도면, 견적, 리뷰, 알림, 관리자, 카탈로그, 레거시 API가 분리되어 있다.
- `routers` 기준 파일은 15개이고, 실제 route decorator는 64개 수준으로 확인된다.
- `pipeline/`은 매칭 엔진을 담당하고, `lookup_tables/`는 장비/재질/공정 데이터를 유지한다.

이 단계에서 드러난 설계 고민은 다음과 같다.

- 이메일 대신 `login_id`를 로그인 식별자로 사용한다. 같은 이메일로 buyer와 supplier가 모두 가입할 수 있게 하기 위해서다.
- JWT의 `sub`와 리소스 소유자를 비교해 소유권을 검증한다.
- RFQ는 `draft` 없이 생성 즉시 `open`으로 둔다. 데모 흐름을 단순화한 결정이다.
- 발주 시 장비 스케줄 자동 예약은 제거하고 업체가 직접 스케줄을 관리하게 한다.
- 주문 취소 시 `booked_hours` 자동 환원은 미구현으로 남기고 수동 관리로 판단한다.
- 실시간 알림은 WebSocket 대신 DB 폴링 방식으로 둔다.

즉, 이 구간은 "모든 자동화"보다 "시연 가능한 상태 머신과 권한 체계"를 우선한 단계다.

### 2026-05-11: VLM 정확도의 한계가 명확해지고 수동 보완 전략이 생김

`VLM_server\v_b_export_samples\summary.json`과 `claude_assessment.md`는 V.B Phase C 결과를 평가한 기록이다.

자동 검증 기준으로는 10개 샘플 모두 schema validation을 통과했다. 하지만 사람이 직접 이미지와 JSON을 비교한 평가는 훨씬 냉정했다.

- title block은 대체로 강했다. 10개 중 9개 핵심 필드가 정확했다.
- 첫 번째 view의 치수 추출은 꽤 넓게 잡혔다.
- notes는 단순 번호 목록에서 강했지만 일부 hallucination과 중복이 있었다.
- table/BOM은 약했다. 10개 중 7개에서 누락, 2개에서 schema echo 문제가 확인되었다.
- view는 일부 누락되거나 같은 치수가 여러 view에 복제되는 문제가 있었다.

여기서 중요한 시행착오는 "schema가 유효하다"와 "내용이 맞다"가 다르다는 점이다. JSON 형식은 맞아도 실제 도면 내용과 맞지 않으면 매칭 품질이 무너질 수 있다.

그래서 이후 문서들은 다음 방향을 제시한다.

- V.B 결과는 즉시 운영 가능하지만 한계 안내가 필요하다.
- BOM 누락, 다중 view 누락, notes hallucination은 사용자 확인 또는 수동 입력 UI로 보완한다.
- V.B schema를 business-level `parts[]`로 변환하는 layer를 둔다.
- V.E-1 Donut FT를 통해 table과 view 추출 성능을 올리는 방향으로 간다.

### 2026-05-11~05-12: Replicate 배포 시행착오

`V_E_CLOUD_DEMO_HYBRID_PLAN_ver.E.md`는 GPU 서버를 직접 운영하지 않고 Replicate를 외부 inference로 쓰는 hybrid 전략을 제안한다.

당시 판단:

- IMMA FastAPI 서버는 GPU 없이 유지한다.
- 도면 인식은 Replicate가 담당한다.
- 시연 1회 비용은 낮고, idle 비용은 0으로 만든다.
- cold start가 길기 때문에 시연 5분 전 warm-up call을 한다.
- 실제 클라이언트 도면의 PII 우려가 있으므로 시연 sample만 전송한다.

하지만 `replicate_debug_package.zip`의 디버그 리포트를 보면 첫 배포는 순조롭게 끝나지 않았다.

성공한 것:

- Replicate 계정, billing, WSL2, Docker, cog CLI, cog login
- private model 생성
- A100 80GB 설정
- `cog push` 성공
- Playground input schema 노출

실패한 것:

- 실제 Run 실행 시 worker setup 단계에서 version이 disabled 처리됨
- 핵심 에러는 `vLLM + torch + Cog/Replicate worker setup` 호환 문제로 추정됨

중간에 해결한 문제:

- `CogPath` alias를 Cog가 입력 타입으로 인식하지 못해 `unsupported type: CogPath`가 발생했다.
- `from cog import Path as CogPath`를 제거하고, `pathlib.Path`는 `LocalPath`로 바꿔 빌드 단계 진입까지 해결했다.

그러나 이후에도 `infer_schema(func): Parameter input has unsupported type torch.Tensor` 문제가 재현되었다. 그래서 디버그 문서는 세 가지 길을 제안한다.

- Path A: Cog CLI upgrade
- Path C: torch 버전 고정/다운그레이드
- Path B: vLLM 제거 + transformers 기반으로 재작성

이 경험의 핵심은 배포 성공과 실제 추론 성공을 분리해서 봐야 한다는 점이다. `cog push`가 성공해도 worker setup이 실패하면 서비스는 동작하지 않는다.

### 2026-05-12~05-13: Path B로 안정성 우선 전환

`path_b.zip`의 `PATH_B_GUIDE.md`는 vLLM을 제거하고 transformers 기반으로 전환하는 계획이다.

Path B의 판단:

- Qwen3-VL-30B + vLLM + A100 구조는 정확도는 기대되지만 배포 호환성이 불안정했다.
- Qwen2-VL-7B + transformers는 느리지만 Cog setup 성공 가능성이 높다.
- GPU는 A100 80GB에서 A40/L40S로 낮출 수 있다.
- 의존성은 `>=` 대신 정확한 버전으로 고정해 재현성을 높인다.
- push 전에 반드시 로컬 `cog build`와 `cog predict`를 돌려 실패 비용을 줄인다.

이 시점의 의사결정은 "가장 강한 모델"보다 "시연에서 실제로 도는 모델"을 우선한 것이다. 정확도 손실을 감수하고 안정성과 비용을 잡는 방향으로 옮겨간 셈이다.

### 2026-05-13: UI 순서와 화면 검증

`imma_project_UI_순서_스크린샷.zip`, `UI_순서_스크린샷.zip`, `imma_project_0513_2024.zip`은 발표 동선과 화면 순서를 고정하려는 산출물이다.

이때부터는 기능 자체보다 시연자가 어떤 순서로 버튼을 누르고, buyer/supplier/admin이 어떤 화면에서 상태를 확인할지가 중요해졌다.

관련 텍스트 파일에는 `시연_버튼_클릭_순서.txt`, `시연용4.txt`가 있고, UI 스크린샷 묶음이 함께 생겼다. 이는 백엔드 구현이 어느 정도 정리된 뒤 발표 흐름을 검증한 단계로 볼 수 있다.

### 2026-05-14: 최종 배포, UI 연결, QC, V.E Full Architecture

`imma_20260514_0914.zip`의 `IMMA_UI_connection_plan_v3.md`는 Phase 1 발표용으로 UI와 백엔드를 어떻게 연결할지 정리한다.

이 문서의 핵심 진단:

- 기존 UI에는 `site-actions.js`가 실제 API 흐름 위에 데모 시뮬레이션 레이어를 덮고 있었다.
- 단순히 API만 붙이면 전역 submit/click handler가 실제 흐름을 막을 수 있다.
- Phase 1에서는 demo script를 분리하고, 실제 모드에서는 `auth.js`, `imma-api.js`, `imma-ui-utils.js` 같은 공용 레이어로 연결해야 한다.
- 가입 후 자동 로그인은 서버가 토큰을 주지 않으므로 `/api/login`을 다시 호출해야 한다.
- supplier의 주문 진입은 별도 주문 목록이 아니라 `order_confirmed` 알림의 `reference_id`를 타고 들어가는 구조다.

`RAILWAY_DEPLOY.md`는 발표 배포 운영의 현실적인 제약을 정리한다.

- `JWT_SECRET` 기본값 사용 시 production startup fail
- PostgreSQL 초기화 필요
- Replicate token과 model version 필요
- Neo4j는 ngrok 터널에 의존
- VLM timeout 시 fixture fallback 필요

같은 날 `qc_002\설명.txt`에는 실제 UI 검수 의견도 남았다.

- 결제하기가 안 됨
- 비교 항목이나 등록일이 네모 박스 안에 들어가거나 일자처럼 보이면 좋겠음
- `계약-결제-생산중-검수-출하-납품완료` 흐름에서 일자는 없어져도 되지만 이미지는 남았으면 좋겠음

이는 최종 단계에서도 발표용 UX 품질과 상태 표현 방식이 계속 다듬어지고 있었음을 보여준다.

또한 `server.zip`, `replicate_v_e_donut_yolo_path_b3.zip`에는 Path B-3 v2, 즉 V.E Full Architecture 배포 패키지가 들어 있다.

최종 V.E 방향:

- YOLOv11 Stage 1: figure/note/table 영역 검출
- YOLOv11 Stage 2: figure 내부 title block/view 분리
- YOLOv11 OBB Stage 3: PMI 기호 검출
- Donut 768M + LoRA: region별 OCR/JSON
- Pydantic: V.E 15-field schema 검증
- Replicate L4 GPU 권장

이 구조는 이전의 "전체 이미지를 Qwen으로 한 번에 읽는 방식"에서 벗어나, 학습된 region crop과 schema 검증을 결합하는 쪽으로 이동한 것이다.

## 4. 반복해서 등장한 시행착오 패턴

### 4.1 범위를 줄이는 것도 설계였다

초기 기획에는 결제, 정산, 메시지, AS, 통계, QC 체크리스트까지 들어 있었지만, 발표용 Phase 1에서는 핵심 거래 흐름만 남겼다. 이는 기능 포기가 아니라 발표 성공 확률을 높이기 위한 범위 관리였다.

### 4.2 AI 결과는 자동화하되, 최종 판단은 보완 가능하게 만들었다

VLM 결과는 schema validation만으로는 충분하지 않았다. title block은 강했지만 table, multi-view, hallucination 문제가 남았다. 따라서 수동 입력, fixture fallback, warning, user_action_required 같은 보호 장치를 둔 것이 핵심이다.

### 4.3 배포 문제는 모델 정확도와 별개의 리스크였다

Qwen3-VL-30B 기반 V.B demo는 모델 자체보다 vLLM, torch, Cog, Replicate worker setup 조합에서 막혔다. 이 문제는 ML 성능 문제가 아니라 운영 환경 호환성 문제였다. 그래서 Path B는 정확도보다 실행 안정성을 우선했다.

### 4.4 데모 UI와 실제 API는 충돌할 수 있었다

`site-actions.js`가 전역 submit/click을 가로채는 구조였기 때문에, 실제 API 연결 전에는 데모 레이어 분리가 필요했다. 이는 프론트엔드에서 흔한 "보이는 데모"와 "실제 동작" 사이의 간극을 잘 보여준다.

### 4.5 상태 전이와 권한 검증이 제품의 뼈대가 되었다

RFQ, match, quote, order, job, shipment, notification, admin 검수는 각각 따로 보이면 단순 API지만, 실제로는 상태 전이와 소유권 검증으로 묶여 있다. 이 프로젝트는 후반부로 갈수록 UI보다 상태 머신과 권한 매트릭스를 명확히 하는 쪽으로 성숙했다.

### 4.6 비용과 개인정보도 설계 변수였다

Replicate는 GPU를 직접 운영하지 않아도 되는 장점이 있지만, cold start와 외부 전송 문제가 있었다. 그래서 warm-up, 비용 모니터링, 시연 sample만 전송, 자체 GPU/Runpod 대안 검토가 함께 문서화되었다.

## 5. 발표에서 강조할 수 있는 포인트

1. 이 프로젝트는 처음부터 역할별 제조 거래 흐름을 기준으로 설계되었다.
2. 도면 인식, 매칭, 견적, 발주, 생산, 납품까지 이어지는 상태 전이를 문서와 코드로 관리했다.
3. 구현 도중 생긴 문제를 덮지 않고 백업본, 수정 전후 파일, 디버그 리포트, 가이드로 남겼다.
4. VLM의 한계를 정량/정성 평가로 확인하고 수동 보완과 대안 모델 구조로 이어갔다.
5. 배포 실패를 통해 vLLM 제거, transformers 전환, Donut/YOLO 구조로 단계적 대안을 만들었다.
6. 최종적으로는 발표용 UI 흐름, Railway 배포, QC 의견까지 연결해 "실험 설계 → 구현 → 검증 → 보완"의 이력관리 체계를 갖췄다.

## 6. 주요 근거 파일

| 구분 | 파일/압축 | 확인한 내용 |
|---|---|---|
| 초기 기획 | `(구)지능형zip\20260421.zip` | 클라이언트, 가공업체, 관리자 3자 흐름 |
| 발표 스토리 | `(구)지능형zip\영상편집_이전_대화_필수.zip` | 영상 순서, 서비스 설명, 파급효과 구성 |
| 초기 서버 | `(구)지능형zip\imma_client_v1.zip` | Docker/Railway/로컬 서버 구분 |
| RAG 설계 | `(구)지능형zip\RAG-20260430T111257Z-3-001.zip` | VLM JSON 파싱, material alias, 하드필터, 장비 검증 |
| 기능 범위 | `imma_project_0511_1739\imma_project\틀\기준점.txt` | 구현 항목과 제외 항목 |
| 후속 고민 | `imma_project_0511_1739\imma_project\틀\추후_작업할_수도_있는_것.txt` | 스케줄 API, 수주 on/off, 서버 진입 링크 |
| 백엔드 구조 | `imma_project_0511_1739\imma_project\fas-main\구현_계획서.md` | APIRouter 분리, DDL, 상태 전이, 미구현 항목 |
| 프론트 명세 | `imma_project_0511_1739\imma_project\fas-main\프론트엔드_통합_명세서.md` | 화면별 API, 인증, 상태 배지, 알림 |
| VLM 평가 | `imma_project_0511_1739\imma_project\VLM_server\v_b_export_samples\summary.json` | 10개 샘플 schema validation과 region 통계 |
| VLM 정성 평가 | `imma_project_0511_1739\imma_project\VLM_server\v_b_export_samples\claude_assessment.md` | title/view/table/notes 정확도와 한계 |
| Replicate 계획 | `V_E_CLOUD_DEMO_HYBRID_PLAN_ver.E.md` | cloud mode, 비용, cold start, warm-up |
| Replicate 실패 | `replicate_debug_package.zip` | CogPath 수정, worker setup 실패, vLLM/torch 호환 이슈 |
| Path B | `path_b.zip` | vLLM 제거, transformers 7B, 버전 고정, 사전 검증 |
| UI 연결 | `imma_20260514_0914.zip` | Phase 1 UI와 백엔드 연결 계획, demo script 분리 |
| Railway 배포 | `imma_20260514_0914.zip\RAILWAY_DEPLOY.md` | 환경변수, fixture fallback, Neo4j/ngrok 제약 |
| QC | `qc_002\설명.txt` | 결제 버튼, 비교 항목/등록일 표현, 상태 흐름 UI 의견 |
| V.E 최종 대안 | `server.zip`, `replicate_v_e_donut_yolo_path_b3.zip` | YOLOv11 3-stage + Donut FT + Pydantic 구조 |

## 7. 결론

이 폴더는 단순한 백업 묶음이 아니라, 실험 설계와 이력관리가 실제로 수행된 흔적이다. 파일명에는 날짜별 스냅샷이 남아 있고, 문서에는 왜 그 결정을 했는지가 남아 있으며, 수정 전후 압축과 디버그 패키지에는 실패를 재현하고 다음 대안을 세운 과정이 남아 있다.

가장 중요한 흐름은 다음과 같다.

```text
역할별 서비스 기획
→ 발표 스토리 정리
→ DB/서버/클라이언트 초기 구현
→ RAG/매칭 파이프라인 설계
→ 기능 범위 확정과 제외
→ FastAPI 라우터 구조화
→ VLM 평가와 수동 보완 전략
→ Replicate 배포 실패와 디버그
→ Path B 안정성 대안
→ UI/API 연결 계획
→ Railway 배포와 QC
→ YOLO + Donut 기반 V.E Full Architecture
```

따라서 발표에서는 "많은 파일이 생겼다"가 아니라, "각 파일이 다음 의사결정을 가능하게 만든 실험 기록이었다"고 설명하는 것이 좋다.
