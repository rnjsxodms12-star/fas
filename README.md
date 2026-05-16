

| Role | Contributor | Repository |
|------|------|--------|
| Model Training & Drawing Recognition | 한지형 | [amadda0616-hash/IMMA](https://github.com/amadda0616-hash/IMMA) |
| Server & Frontend | 권태은 | [rnjsxodms12-star/fas](https://github.com/rnjsxodms12-star/fas) |
| Database & RAG | 김태훈 | [hexadark/IMMA_Personal_Server_Archive](https://github.com/hexadark/IMMA_Personal_Server_Archive) |

## 개발 흐름

초기에는 FastAPI 서버, Railway 배포, PostgreSQL 연결, 기본 API 및 UI 흐름을 먼저 구성했다.  
이후 RAG/DB 팀원이 해당 구조를 참고하여 별도 서버 저장소에서 DB schema, lookup data, matching pipeline을 고도화했다.

따라서 본 저장소는 IMMA 프로젝트의 초기 서버/프론트 기반과 시연 흐름 정리를 중심으로 하며,  
RAG/DB 매칭 고도화 구조는 팀원 저장소에서 관리되었다.

현재 최종 시연용 UI와 Railway 운영 서버는 RAG/DB 팀원 저장소를 기준으로 관리되고 있다.  
본 저장소는 초기 서버 구축, DB 연결, API 구성, UI 통합 시도 및 시연 흐름을 기록한 아카이브 성격의 저장소이다.

# IMMA: 지능형 제조 가공 매칭 플랫폼

IMMA(Intelligent Manufacturing Matching Agent)는 도면 기반 제조 견적 요청부터 AI 분석, 업체 매칭, 견적 회신, 발주, 생산 진행 공유, 납품, 리뷰까지 이어지는 제조 거래 흐름을 하나의 플랫폼으로 연결하기 위해 진행한 프로젝트입니다.

기존 제조 견적 과정은 도면 전달, 전화, 이메일, 업체 탐색, 견적 비교가 분산되어 있어 시간이 오래 걸리고 정보가 누락되기 쉽습니다.  
IMMA는 이러한 문제를 해결하기 위해 클라이언트, 가공업체, 관리자 역할을 분리하고, 도면 데이터와 업체 역량 데이터를 기반으로 제조 매칭 흐름을 설계했습니다.

---

## 프로젝트 개요

IMMA의 핵심 흐름은 다음과 같습니다.

```text
도면 업로드
→ AI 도면 분석
→ RFQ 확정
→ 업체 매칭
→ 견적 회신
→ 발주/계약
→ 생산 진행 공유
→ 납품 인증
→ 리뷰 반영
→ 관리자 운영 로그 확인

이 프로젝트는 단순한 화면 프로토타입이 아니라, FastAPI 서버, PostgreSQL 데이터베이스, RAG/DB 기반 매칭 API, VLM 도면 분석 실험, 역할별 UI 시연 흐름을 통합해 실제 시연 가능한 구조로 구성했습니다.

주요 기능
클라이언트
회원가입 및 로그인
도면 업로드
견적 요청 정보 입력
AI 분석 결과 확인
RFQ 확정 및 업체 매칭 실행
추천 업체 비교
견적 확인 및 발주 진행
생산 진행도 확인
납품 확인 및 리뷰 등록
가공업체
기업회원 가입
오더리스트 확인
견적 요청 수락
작업 정보 회신
최종 발주 수락
생산 진행도 공유
납품 정보 발송
받은 리뷰 확인
관리자
AI 분석 로그 확인
매칭 관리
계약/결제 상태 확인
납품 정산 로그 확인
리뷰/평점 관리
클라이언트·가공업체 데이터 관제
사용 기술
Backend
Python
FastAPI
SQLAlchemy
REST API
Swagger / OpenAPI
Database
PostgreSQL
Railway PostgreSQL
JSONB 기반 도면/분석 결과 저장
업체, RFQ, 도면, 매칭, 주문, 리뷰 데이터 관리
Frontend
HTML
CSS
JavaScript
역할별 UI 구성
Client UI
Supplier UI
Admin UI
AI / Matching
VLM 기반 도면 분석 실험
OCR / YOLO / Donut / Qwen 계열 모델 검토
Replicate + Cog 기반 클라우드 추론 실험
RAG/DB 기반 업체 매칭 파이프라인
VLM JSON → Match Input 변환 구조 설계
Infra / Tools
Railway
GitHub
Swagger
Replicate
Cog
Google Drive
Miro
Discord
내가 담당한 역할

이번 프로젝트에서 저는 서버, DB, UI 흐름, 실험 이력관리, 시연 준비를 중심으로 작업했습니다.

1. FastAPI 서버 구축 및 배포
FastAPI 기반 API 서버 구성
Railway 배포 환경 구성
PostgreSQL 연결 확인
/db-test를 통한 DB 연결 검증
Swagger /docs 기반 API 테스트
CORS 및 정적 UI 연결 설정
main.py, router 구조 점검 및 백업 관리
2. PostgreSQL / DB 연동
Railway PostgreSQL 연결
DATABASE_URL 환경변수 기반 DB 연결 확인
users, companies, rfqs, drawings 등 주요 테이블 흐름 확인
schema.sql과 실제 DB 구조 차이 파악
login_id 컬럼 누락 등 DB 마이그레이션 이슈 분석
3. RAG/DB 매칭 API 검증
/api/match-v2 매칭 API 테스트
VLM 결과 JSON이 매칭 입력으로 변환되는 흐름 확인
재질, 공정, 수량, 장비 정보를 기준으로 업체 후보가 계산되는 구조 이해
Swagger에서 실제 응답 확인
sample_vlm_result.json → match input → match response 흐름 검증
4. VLM / Replicate 실험 이력관리
Replicate + Cog 기반 VLM 도면 분석 실험 기록
cog build, cog push, Prediction 실행 흐름 정리
Qwen 계열 VLM 실험 중 발생한 worker setup 실패 기록
unsupported type torch.Tensor, LoRA config, transformers architecture 오류 정리
cold start, 비용, 실행 시간 기록
Donut/YOLO 기반 Path B 대안 실험 정리
실시간 호출과 fixture 시연 전략 판단
5. 역할별 UI 통합 및 시연 흐름 설계
클라이언트, 가공업체, 관리자 화면 흐름 정리
견적 요청 → 업체 매칭 → 발주 → 생산 → 납품 → 리뷰까지 이어지는 E2E 시연 구조 설계
버튼 클릭 순서 문서화
시연 중 발생 가능한 오류와 우회 시나리오 정리
3창 시연 및 단일 흐름 시연 방식 비교
최종 발표용 시연 순서 정리
6. 문서화 및 발표자료 제작
기술 스택 PPT 제작
서버 작업 필요 파일 README 작성
Replicate/Cog 빌드·Push README 작성
Replicate 실험 기록 README 작성
실험 설계 및 이력관리 자료 정리
발표 대본 및 마지막 마무리 멘트 작성


프로젝트에서 검증한 것

이번 프로젝트를 통해 다음 내용을 확인했습니다.

FastAPI 서버를 Railway에 배포할 수 있다.
PostgreSQL과 API 서버를 연결할 수 있다.
Swagger를 이용해 API를 검증할 수 있다.
도면 업로드와 분석 결과 저장 구조를 설계할 수 있다.
VLM 결과 JSON을 매칭 API 입력으로 연결할 수 있다.
업체의 재질, 공정, 장비 데이터를 기반으로 후보 추천 흐름을 만들 수 있다.
클라이언트, 가공업체, 관리자 역할별 UI 흐름을 구성할 수 있다.
Replicate 기반 AI 추론은 가능하지만 cold start와 worker setup 리스크가 존재한다.
실시간 AI 호출이 불안정할 경우 fixture 기반 시연 전략이 필요하다.

실험 및 시행착오

프로젝트 중 특히 많은 시행착오가 있었던 부분은 VLM 도면 분석과 Replicate 배포였습니다.

초기에는 Qwen 계열 대형 VLM을 Cog로 패키징해 Replicate에 올리는 구조를 실험했습니다.
하지만 실제 배포 과정에서 다음과 같은 문제가 발생했습니다.

worker setup failed
unsupported type torch.Tensor
CogPath 타입 문제
LoRA peft_version 오류
transformers architecture 미지원
vLLM / torch / CUDA 호환성 문제
cold start 지연

이 실험을 통해 단순히 모델 성능만 보는 것이 아니라, 실제 서비스와 시연에서는 배포 안정성, 실행 시간, 비용, 재현성이 함께 중요하다는 점을 확인했습니다.

이후에는 vLLM 기반 대형 모델 경로뿐 아니라, Donut/YOLO 기반 Path B 대안도 검토했습니다.
Replicate Playground에서 도면 이미지를 입력하고 JSON Output이 생성되는 흐름을 확인했으며, 이를 발표 자료와 실험 이력에 반영했습니다.

시연 흐름

최종 시연은 다음 구조로 설계했습니다.

1. 클라이언트 회원가입/로그인
2. 새 견적 요청
3. 도면 업로드
4. 기본 요청 정보 입력
5. AI 분석 결과 확인
6. RFQ 확정 및 업체 매칭 실행
7. 추천 업체 선택
8. 가공업체 화면에서 견적 요청 수락
9. 작업 정보 회신
10. 클라이언트 결제/발주
11. 가공업체 최종 발주 수락
12. 생산 진행도 공유
13. 클라이언트 생산 진행 확인
14. 납품 정보 발송
15. 클라이언트 납품 확인 및 리뷰 등록
16. 가공업체 리뷰 확인
17. 관리자 화면에서 전체 로그 확인

프로젝트를 통해 배운 점

이번 프로젝트를 통해 단순히 기능을 구현하는 것보다, 서버, DB, AI 실험, UI, 발표 시연이 하나의 흐름으로 연결되는 것이 중요하다는 점을 배웠습니다.

특히 다음을 배웠습니다.

API는 Swagger로 직접 검증해야 한다.
DB schema와 실제 운영 DB는 항상 일치하지 않을 수 있다.
AI 모델은 로컬에서 되는 것과 클라우드에서 되는 것이 다를 수 있다.
cog push 성공과 prediction 성공은 다르다.
시연에서는 새 기능보다 안정성이 중요하다.
실패 로그도 프로젝트의 중요한 산출물이다.
팀 프로젝트에서는 기술 구현뿐 아니라 문서화와 흐름 정리가 중요하다.

나의 기여 요약

FastAPI 서버 배포 및 검증
Railway PostgreSQL 연결 확인
Swagger 기반 API 테스트
RAG/DB 매칭 API 흐름 검증
VLM 결과 JSON과 Match API 계약 구조 정리
Replicate/Cog 실험 이력관리
UI 시연 흐름 설계
클라이언트·가공업체·관리자 E2E 시연 정리
시연 리스크 및 우회 전략 작성
기술 스택 PPT 및 README 문서화

최종 정리

IMMA는 완성된 상용 서비스라기보다, 도면 기반 제조 견적 과정을 데이터와 AI 기반 플랫폼으로 전환할 수 있는 가능성을 검증한 프로젝트입니다.

이번 프로젝트를 통해 제조 견적이 단순히 전화와 이메일로만 이루어지는 과정이 아니라, 도면 데이터, 업체 역량 데이터, AI 분석 결과, 운영 로그를 기반으로 연결될 수 있다는 점을 확인했습니다.

저는 이 과정에서 서버, DB, UI, AI 실험, 시연 흐름을 연결하고, 프로젝트가 실제 발표 가능한 형태로 정리되도록 통합과 이력관리 역할을 수행했습니다.
