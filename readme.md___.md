2026-05-02 IMMA RAG/DB Phase 1 운영 통합 완료

완료:
- Railway PostgreSQL 연결 성공
- imma 스키마/seed 구성 완료
- lookup_data.json / equipment_catalog.json 로드
- RAG pipeline CLI 실행 성공
- RAG pipeline FastAPI 실행 성공
- GitHub 운영 repo에 pipeline/lookup_tables 추가
- 기존 main.py 유지
- 신규 POST /api/match-v2 추가
- Railway 운영 서버 배포 성공
- Swagger에서 /api/match-v2 200 응답 확인
- 장비 검증 equipment_verified true/false 반환 확인

현재 상태:
- 기존 /match/{rfq_id}: v1 간단 매칭 유지
- 신규 /api/match-v2: VLM JSON 기반 RAG/DB 매칭 엔진