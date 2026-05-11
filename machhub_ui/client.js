let fetchedCompanies = [];

// ===== 선택된 업체 데이터 전역 저장 =====
let selectedOrder = {
    companyName: null,
    price: null,
    deliveryDays: null,
    matchScore: null,
    region: null,
    processes: [],
    status: 'idle'  // idle | waiting | ordered | producing
};

// 발주 상태 배지 업데이트 헬퍼
function setOrderStatusBadge(status) {
    const badge = document.getElementById('order-status-badge');
    if (!badge) return;
    const MAP = {
        idle:      { cls: 'osb-badge-idle',     text: '업체 선택 전' },
        waiting:   { cls: 'osb-badge-waiting',  text: '발주 대기' },
        ordered:   { cls: 'osb-badge-ordered',  text: '발주 완료' },
        producing: { cls: 'osb-badge-producing',text: '생산 준비 중' }
    };
    badge.className = `osb-badge ${MAP[status]?.cls || ''}`;
    badge.textContent = MAP[status]?.text || '-';
    selectedOrder.status = status;
}

// ===== A. AI 로딩 오버레이 함수들 =====
const AI_LOADING_STEPS = ['도면 분석 중...', '가공 방식 추론 중...', '업체 매칭 중...'];

function showAiLoadingOverlay(show) {
    let overlay = document.getElementById('ai-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ai-loading-overlay';
        overlay.className = 'ai-loading-overlay';
        overlay.innerHTML = `
            <div class="alo-box">
                <div class="alo-spinner"><i class="ri-loader-4-line spin"></i></div>
                <div class="alo-steps">
                    ${AI_LOADING_STEPS.map((s, i) => `
                        <div class="alo-step ${i===0?'active':''}" id="alo-step-${i}">
                            <i class="ri-${i===0?'radar':'circle'}-line"></i> ${s}
                        </div>`).join('')}
                </div>
            </div>`;
        const section = document.getElementById('ai-result-section');
        if (section) section.prepend(overlay);
    }
    overlay.style.display = show ? 'flex' : 'none';
}

function updateAiLoadingStep(idx) {
    AI_LOADING_STEPS.forEach((_, i) => {
        const el = document.getElementById(`alo-step-${i}`);
        if (!el) return;
        if (i < idx) { el.className = 'alo-step done'; el.querySelector('i').className = 'ri-check-line'; }
        else if (i === idx) { el.className = 'alo-step active'; }
    });
}

function finishAiLoading(btn) {
    return new Promise(resolve => {
        updateAiLoadingStep(3);
        setTimeout(() => {
            showAiLoadingOverlay(false);
            btn.innerHTML = '✅ 분석 완료 — 업체 매칭 완료';
            btn.style.background = 'var(--success)';
            resolve();
        }, 400);
    });
}

// ===== B. 더미 업체 데이터 (실전 수준) =====
const DUMMY_COMPANIES = [
    {
        company_name: '시흥정밀',
        region: '경기 시흥', rating: 4.9, reviewCount: 214,
        deliveryDays: 6, price: 6250000,
        unitPrice: 62500, reliability: 98,
        processes: ['CNC 선반', 'CNC 밀링', '후처리(도금)'],
        materials: ['SUS304', 'SUS316', 'AL6061'],
        main_specialty: 'CNC 정밀가공'
    },
    {
        company_name: '미래가공',
        region: '인천 남동', rating: 4.7, reviewCount: 122,
        deliveryDays: 8, price: 6500000,
        unitPrice: 65000, reliability: 95,
        processes: ['CNC 밀링', '드릴링', '연삭'],
        materials: ['AL7075', 'SUS304', 'SUS316', 'Ti-6Al-4V'],
        main_specialty: '항공·방산 부품'
    },
    {
        company_name: '한빛정밀',
        region: '경기 안산', rating: 4.6, reviewCount: 117,
        deliveryDays: 5, price: 6750000,
        unitPrice: 67500, reliability: 92,
        processes: ['CNC 밀링', '드릴링'],
        materials: ['AL6061', 'S45C', 'SUS304'],
        main_specialty: '산업설비 부품'
    }
];

// ===== B. 업체 카드 렌더링 (더미/DB 공통) =====
function renderCompanyCards(companies) {
    const container = document.getElementById('company-list-container');
    if (!container) return;
    container.innerHTML = '';

    const qty = parseInt(document.getElementById('input-quantity')?.value) || 100;
    const dueDays = parseInt(document.getElementById('input-due-days')?.value) || 7;

    companies.forEach((company, index) => {
        const isRecommended = index === 0;
        const onTime = company.deliveryDays <= dueDays;
        
        // 단가 우선, 없으면 금액에서 역산
        const unitP = company.unitPrice || 62500;
        const totalPrice = unitP * qty;
        
        // 객체 데이터 동기화
        company.unitPrice = unitP;
        company.price = totalPrice;
        company.quantity = qty;

        const card = `
        <div class="cc-card ${isRecommended ? 'cc-recommended' : ''}" id="company-card-${index}">
            <div class="cc-top">
                <div class="cc-left">
                    ${isRecommended ? '<span class="cc-badge"><i class="ri-award-fill"></i> AI 추천</span>' : ''}
                    <div class="cc-name"><i class="ri-building-2-fill"></i> ${company.company_name}</div>
                    <div class="cc-region"><i class="ri-map-pin-line"></i> ${company.region || '전국'}</div>
                </div>
                <div class="cc-rating">
                    <i class="ri-star-fill"></i>
                    <strong>${company.rating.toFixed(1)}</strong>
                    <span>(${company.reviewCount})</span>
                </div>
            </div>

            <div class="cc-processes">
                ${(company.processes || []).map(p => `<span class="cc-proc-tag">${p}</span>`).join('')}
            </div>

            <div class="cc-stats">
                <div class="cc-stat">
                    <div class="cc-stat-label">예상 납기</div>
                    <div class="cc-stat-value ${onTime ? 'clr-green' : 'clr-red'}">${company.deliveryDays}일</div>
                    <div class="cc-stat-sub ${onTime ? 'clr-green' : 'clr-red'}">${onTime ? '✓ 충족' : '⚠ 초과'}</div>
                </div>
                <div class="cc-divider"></div>
                <div class="cc-stat">
                    <div class="cc-stat-label">예상 단가</div>
                    <div class="cc-stat-value">${unitP.toLocaleString()}원</div>
                    <div class="cc-stat-sub">/ EA</div>
                </div>
                <div class="cc-divider"></div>
                <div class="cc-stat cc-stat-total">
                    <div class="cc-stat-label">총 금액</div>
                    <div class="cc-stat-value clr-blue">${totalPrice.toLocaleString()}원</div>
                    <div class="cc-stat-sub">수량 ${qty}EA</div>
                </div>
            </div>

            <div class="cc-trust">
                <span class="cc-trust-label">신뢰도 ${company.reliability}%</span>
                <div class="cc-trust-track"><div class="cc-trust-fill" style="width:${company.reliability}%"></div></div>
            </div>

            <div class="cc-mats">
                ${(company.materials || []).map(m => `<span class="cc-mat">${m}</span>`).join('')}
            </div>

            <div class="cc-actions">
                <button class="btn-outline cc-btn-detail">상세 보기</button>
                <button class="btn-primary cc-btn-select" onclick="selectCompany(${index})">선택하기 <i class="ri-arrow-right-line"></i></button>
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', card);
    });

    fetchedCompanies = companies;
}

// ===== 1순위: 입력값 실시간 연동 =====
function syncFormPreview() {
    const qty = document.getElementById('input-quantity')?.value || '-';
    const mat = document.getElementById('input-material')?.value || '-';
    const days = document.getElementById('input-due-days')?.value || '-';
    const loc = document.getElementById('input-location')?.value || '-';

    const banner = document.getElementById('form-summary-banner');
    if (banner) banner.style.display = 'flex';

    const el = (id, val) => { const e = document.getElementById(id); if(e) e.innerText = val; };
    el('fsb-qty', `${qty} EA`);
    el('fsb-mat', mat);
    el('fsb-days', `${days}일`);
    el('fsb-loc', loc);

    // 업체 비교 카드의 납기도 업데이트
    document.querySelectorAll('.due-days-label').forEach(el => { el.innerText = `희망: ${days}일`; });
    // 발주 화면 수량 동기화
    const cq = document.getElementById('contract-quantity');
    if(cq) cq.innerText = `${qty} EA`;
}

// ===== 발주 상태 바 업데이트 =====
// ===== 생산 진행도 업데이트 헬퍼 =====
function updateProductionProgress(nodeIndex) {
    const nodes = [1, 2, 3, 4, 5];
    const now = new Date();
    const timeStr = `${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    nodes.forEach(idx => {
        const node = document.getElementById(`p-node-${idx}`);
        const line = document.getElementById(`p-line-${idx}`);

        if (idx < nodeIndex) {
            // 완료 단계
            node?.classList.add('completed');
            node?.classList.remove('active');
            const icon = node?.querySelector('i');
            if (icon) icon.className = 'ri-check-line';
        } else if (idx === nodeIndex) {
            // 현재 단계
            node?.classList.add('active');
            node?.classList.remove('completed');
            const small = node?.querySelector('small');
            if (small) small.textContent = timeStr;
            const icon = node?.querySelector('i');
            if (icon && !icon.classList.contains('spin')) {
                 icon.classList.add('spin');
            }
        } else {
            // 대기 단계
            node?.classList.remove('completed', 'active');
        }

        if (line) {
            line.classList.toggle('completed', idx < nodeIndex);
        }
    });
}

function updateOrderStatus(step) {
    for (let i = 1; i <= 4; i++) {
        const s = document.getElementById(`osb-step-${i}`);
        const l = document.getElementById(`osb-line-${i}`);
        if (!s) continue;
        s.classList.remove('active', 'done');
        if (i < step) s.classList.add('done');
        else if (i === step) s.classList.add('active');
        if (l) l.classList.toggle('done', i < step);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchCompanies();
    setupInteractions();
    syncFormPreview(); // 열릴 때 기본값 반영
});

async function fetchCompanies() {
    const container = document.getElementById('company-list-container');
    if (!container) return;

    try {
        const response = await fetch('https://fas-production-c5f2.up.railway.app/companies');
        const result = await response.json();
        if (result.companies) {
            const dbCompanies = result.companies.filter(c => c.company_type === 'supplier').slice(0, 3);
            // DB 데이터에 더미 필드 보강
            dbCompanies.forEach((c, i) => {
                c.deliveryDays = c.deliveryDays || (6 + i);
                c.price = c.price || (6250000 + i * 250000);
                c.rating = c.rating || (4.9 - i * 0.15);
                c.reviewCount = c.reviewCount || (214 - i * 50);
                c.unitPrice = c.unitPrice || Math.round(c.price / 100);
                c.reliability = c.reliability || (98 - i * 3);
                c.processes = c.processes || [(c.main_specialty||'CNC 밀링').split(',')[0]];
                c.materials = c.materials || ['SUS304', 'AL6061'];
            });
            renderCompanyCards(dbCompanies);
            return;
        }
    } catch (error) {
        console.warn('업체 DB 연결 실패, 더미 데이터 사용:', error);
    }
    // 더미 데이터 기본 표시
    renderCompanyCards(DUMMY_COMPANIES);
}

// Called from HTML onclick
function selectCompany(index) {
    const company = fetchedCompanies[index];
    if (!company) return;

    // 2순위: 선택 상태 강조
    document.querySelectorAll('.cc-card').forEach(card => {
        card.classList.remove('selected-card');
        card.style.borderColor = '';
        card.style.boxShadow = '';
    });
    const selectedCard = document.getElementById(`company-card-${index}`);
    if (selectedCard) selectedCard.classList.add('selected-card');

    // 입력값에서 수량/납기 가져오기
    const qty = document.getElementById('input-quantity')?.value || '100';
    const desiredDays = parseInt(document.getElementById('input-due-days')?.value) || 7;

    // 폴백 값
    const rating = company.rating || 4.8;
    const reviewCount = company.reviewCount || 112;
    const deliveryDays = company.deliveryDays || 7;
    const unitPrice = company.unitPrice || 62500;
    const price = unitPrice * parseInt(qty);
    const isOverDue = deliveryDays > desiredDays;

    // Step 4 업데이트
    document.getElementById('contract-company-name').innerHTML = company.company_name;
    document.getElementById('contract-company-rating').innerHTML =
        `<i class="ri-star-fill text-warning"></i> ${rating.toFixed(1)} (${reviewCount}) &middot; ${company.region || '전국'}`;

    // 납기 표시 — 초과 시 빨간색 강조
    const deliveryEl = document.getElementById('contract-delivery');
    if (deliveryEl) {
        deliveryEl.innerHTML = isOverDue
            ? `<span style="color:#dc2626;font-weight:700;">${deliveryDays}일 <small>⚠ 희망 납기 ${desiredDays}일 초과</small></span>`
            : `<span style="color:#059669;font-weight:700;">${deliveryDays}일 <small>✓ 납기 충족</small></span>`;
    }

    document.getElementById('contract-price').innerText = `${price.toLocaleString()}원`;
    const cq = document.getElementById('contract-quantity');
    if (cq) cq.innerText = `${parseInt(qty).toLocaleString()} EA`;

    // 매칭점수 / 서비스 / 상태 반영
    const scoreEl = document.getElementById('contract-score');
    if (scoreEl) scoreEl.textContent = company.matchScore ? `${company.matchScore}점` : '-';
    const serviceEl = document.getElementById('contract-service');
    if (serviceEl) serviceEl.textContent = (company.processes || []).join(', ') || 'CNC 가공';

    // ===== 1. 선택된 업체 데이터 전역 저장 =====
    selectedOrder = {
        companyName: company.company_name,
        price,
        deliveryDays,
        matchScore: company.matchScore || null,
        region: company.region || '전국',
        processes: company.processes || [],
        status: 'waiting'
    };
    // 2. 발주 상태 배지: 발주 대기
    setOrderStatusBadge('waiting');

    // ★ 납기 초과 시 발주 버튼 비활성화
    const btnOrder = document.getElementById('btn-order');
    let warningEl = document.getElementById('due-warning');
    if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.id = 'due-warning';
        warningEl.className = 'due-warning-box';
        btnOrder?.parentNode?.insertBefore(warningEl, btnOrder);
    }

    if (isOverDue) {
        btnOrder.disabled = true;
        btnOrder.style.opacity = '0.45';
        btnOrder.style.cursor = 'not-allowed';
        btnOrder.title = '납기 초과 업체는 발주할 수 없습니다.';
        warningEl.style.display = 'flex';
        warningEl.innerHTML = `
            <i class="ri-error-warning-fill"></i>
            <span>해당 업체의 납기(<strong>${deliveryDays}일</strong>)가 희망 납기(<strong>${desiredDays}일</strong>)를 초과합니다.<br>납기 충족 업체를 선택하거나 희망 납기를 조정해주세요.</span>`;
    } else {
        btnOrder.disabled = false;
        btnOrder.style.opacity = '';
        btnOrder.style.cursor = '';
        btnOrder.title = '';
        warningEl.style.display = 'none';
    }

    // 선택된 업체 배너 표시 (2순위)
    const banner = document.getElementById('selected-company-banner');
    const label = document.getElementById('selected-company-label');
    const priceLabel = document.getElementById('selected-company-price-label');
    if (banner) {
        banner.style.display = 'flex';
        banner.style.animation = 'none';
        requestAnimationFrame(() => { banner.style.animation = ''; });
    }
    if (label) label.innerText = company.company_name;
    if (priceLabel) priceLabel.innerText = `${price.toLocaleString()}원 | 납기 ${deliveryDays}일`;

    // 3순위: 발주 상태바 → 2단계 '업체 선정' 활성화
    updateOrderStatus(2);

    // Step 4로 자동 스크롤
    document.getElementById('contract-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const box = document.querySelector('.company-summary.box');
    if (box) {
        box.style.background = 'var(--primary-light)';
        setTimeout(() => { box.style.background = 'var(--bg)'; }, 600);
    }
}

function setupInteractions() {
    const btnAiStart = document.getElementById('btn-ai-start');
    const fileInput = document.getElementById('file-input');
    const uploadBox = document.getElementById('upload-box');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadPreview = document.getElementById('upload-preview');
    const previewImg = document.getElementById('preview-img');
    const scanLine = document.getElementById('scan-line');
    const fileList = document.getElementById('file-list');

    // 1. 파일 업로드 시뮬레이션
    uploadBox?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 이미지 미리보기
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (previewImg) previewImg.src = e.target.result;
                if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
                if (uploadPreview) uploadPreview.style.display = 'flex';
                // 스캔 효과 잠깐 보여주기
                if (scanLine) {
                    scanLine.style.display = 'block';
                    setTimeout(() => { scanLine.style.display = 'none'; }, 2000);
                }
            };
            reader.readAsDataURL(file);
        }

        // 파일 리스트 업데이트
        if (fileList) {
            fileList.innerHTML = `
                <div class="file-item animate-fade-in">
                    <i class="ri-file-image-line"></i>
                    <div class="file-info">
                        <strong>${file.name}</strong>
                        <span>${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <i class="ri-close-line close-btn" onclick="this.parentElement.remove(); document.getElementById('upload-placeholder').style.display='flex'; document.getElementById('upload-preview').style.display='none';"></i>
                </div>
            `;
        }
        
        resetAiButton();
    });

    // [강화] 입력값 변경 시 실시간 연동 및 버튼 리셋 로직
    const inputIds = ['input-quantity', 'input-material', 'input-location', 'input-due-days', 'input-budget'];
    
    const resetAiButton = () => {
        // 1. 데이터 실시간 동기화
        syncFormPreview();
        if (fetchedCompanies.length > 0) {
            renderCompanyCards(fetchedCompanies);
        }

        // 2. 버튼 재활성화 및 텍스트 변경
        // 분석 완료(성공 상태)이거나 로딩 중이 아닐 때만 리셋
        if (btnAiStart && !btnAiStart.innerHTML.includes('spin')) {
            const isFinished = btnAiStart.innerText.includes('분석 완료') || btnAiStart.style.background.includes('success');
            
            if (isFinished) {
                btnAiStart.innerHTML = '<i class="ri-refresh-line"></i> AI 재분석하기';
                btnAiStart.style.background = 'var(--primary)';
                btnAiStart.disabled = false; // 확실하게 활성화
                
                // 관련 상태 초기화
                const banner = document.getElementById('selected-company-banner');
                if (banner) banner.style.display = 'none';
                updateOrderStatus(1);
                setOrderStatusBadge('idle');
            }
        }
    };

    // 일반 입력 필드 감지
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        el?.addEventListener('input', resetAiButton);
        el?.addEventListener('change', resetAiButton);
    });

    // 태그(CNC 가공, 후처리 등) 클릭 감지 및 토글 로직 추가
    document.querySelectorAll('.tags-group .tag').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('active');
            resetAiButton();
        });
    });

    // 1. AI Analysis Button Interaction
    if (btnAiStart) {
        btnAiStart.addEventListener('click', async () => {
            // C. 입력값 검증
            const quantity = document.getElementById('input-quantity')?.value;
            const location = document.getElementById('input-location')?.value;
            if (!quantity || !location) {
                alert('필수 정보를 입력해주세요 (총 수량, 위치 등).');
                return;
            }

            // A. 로딩 연출 - 단계별 메시지
            const loadingSteps = [
                '🔍 도면 분석 중...',
                '⚙️ 가공 방식 추론 중...',
                '🏭 업체 매칭 중...'
            ];
            let stepIdx = 0;
            btnAiStart.innerHTML = `<i class="ri-loader-4-line spin"></i> ${loadingSteps[0]}`;
            btnAiStart.disabled = true;

            // A. Step 2로 스크롤 후 로딩 배너 표시
            document.getElementById('ai-result-section')?.scrollIntoView({behavior: 'smooth', block: 'start'});
            showAiLoadingOverlay(true);

            // 도면 스캔 애니메이션 활성화
            if (scanLine) scanLine.style.display = 'block';

            const stepInterval = setInterval(() => {
                stepIdx++;
                if (stepIdx < loadingSteps.length) {
                    btnAiStart.innerHTML = `<i class="ri-loader-4-line spin"></i> ${loadingSteps[stepIdx]}`;
                    updateAiLoadingStep(stepIdx);
                }
            }, 600);

            // C. 입력값 → Step 2 배너 업데이트
            syncFormPreview();

            try {
                const rfqResponse = await fetch('https://fas-production-c5f2.up.railway.app/rfq', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        buyer_code: 'B001',
                        material: document.getElementById('input-material')?.value || 'SUS304',
                        process: 'milling',
                        quantity: parseInt(quantity),
                        due_date: '2026-05-15',
                        note: 'UI에서 생성된 견적 요청'
                    })
                });
                const rfqResult = await rfqResponse.json();
                const rfqId = rfqResult.rfq.id;
                const matchResponse = await fetch(`https://fas-production-c5f2.up.railway.app/match/${rfqId}`);
                const matchResult = await matchResponse.json();
                clearInterval(stepInterval);
                await finishAiLoading(btnAiStart);
                if (scanLine) scanLine.style.display = 'none';
                renderMatchedSuppliers(matchResult.recommended_suppliers);
            } catch (error) {
                // A. API 실패 시에도 더미로 결과 보여주기
                console.warn('API 연결 실패, 더미 데이터로 시연:', error);
                clearInterval(stepInterval);
                await finishAiLoading(btnAiStart);
                if (scanLine) scanLine.style.display = 'none';
                // renderMatchedSuppliers를 통해 납기일 등이 보정된 결과 출력
                renderMatchedSuppliers(fetchedCompanies.slice(0, 3));
            }
        });
    }

    // 2. Resolve AI Issues Buttons
    const issueBtns = document.querySelectorAll('.issue-item button');
    issueBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const issueItem = e.target.closest('.issue-item');
            const issueText = issueItem.querySelector('.issue-text').innerText;

            // Simulating prompt for missing data
            const userInput = prompt(`[누락/모호 정보 보완]\n${issueText}에 대한 세부 정보를 입력해주세요:`);
            if (userInput) {
                // Change style to green success state
                issueItem.classList.remove('danger', 'warning');
                issueItem.style.background = '#f0fdf4'; // Tailwind green-50
                issueItem.style.border = '1px solid #bbf7d0'; // Tailwind green-200

                const numBadge = issueItem.querySelector('.issue-num');
                numBadge.style.background = 'var(--success)';
                numBadge.innerHTML = '<i class="ri-check-line"></i>';

                e.target.innerText = '해결 완료';
                e.target.style.color = 'var(--success)';
                e.target.disabled = true;
            }
        });
    });

    // 3. 발주 및 결제 버튼
    const btnOrder = document.getElementById('btn-order');
    if (btnOrder) {
        btnOrder.addEventListener('click', () => {
            const companyName = document.getElementById('contract-company-name').innerText;
            if (companyName === '업체를 선택해주세요') {
                alert('먼저 3단계 목록에서 발주할 업체를 [선택하기] 해주세요.');
                return;
            }

            // 로딩 시작
            btnOrder.innerHTML = '<i class="ri-loader-4-line spin"></i> 에스크로 안전 결제 진행 중...';
            btnOrder.disabled = true;

            setTimeout(() => {
                // 단계 3: 발주 완료
                updateOrderStatus(3);
                setOrderStatusBadge('ordered');
                btnOrder.innerHTML = '발주 완료 <i class="ri-check-double-line"></i>';
                btnOrder.style.background = 'var(--success)';

                setTimeout(() => {
                    // 단계 4: 생산 준비 중
                    updateOrderStatus(4);
                    setOrderStatusBadge('producing');
                    
                    // 생산 진행도 1단계(원자재 입고) 완료, 2단계(가공 시작) 활성화
                    updateProductionProgress(2);

                    document.querySelector('.progress-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 1200);

                alert(`[발주 완료] ${companyName}\n예상 견적: ${selectedOrder.price?.toLocaleString()}원 | 납기: ${selectedOrder.deliveryDays}일\n\n생산 준비가 시작됩니다. 5단계에서 실시간 진행상황을 확인하세요.`);
            }, 1500);
        });
    }
}

// renderMatchedSuppliers: API 매칭 결과를 공통 렌더러로 위임
function renderMatchedSuppliers(suppliers) {
    if (!suppliers || suppliers.length === 0) {
        suppliers = JSON.parse(JSON.stringify(DUMMY_COMPANIES));
    }

    const desiredDays = parseInt(document.getElementById('input-due-days')?.value) || 7;

    suppliers.forEach((c, i) => {
        // 첫 번째 업체는 항상 희망 납기를 충족하거나 -1일 (AI 최적화 느낌)
        if (i === 0) {
            c.deliveryDays = Math.max(2, desiredDays - 1);
            c.matchScore = 98;
        } else {
            c.deliveryDays = desiredDays + i; // 나머지는 조금씩 초과하게
            c.matchScore = 95 - i * 5;
        }

        // 합리적인 단가 설정 (예: 62,500원 베이스)
        c.unitPrice = 62500 - (i * 2500); 
        c.rating = c.rating || (4.9 - i * 0.15);
        c.reviewCount = c.reviewCount || (214 - i * 50);
        c.reliability = c.reliability || (98 - i * 3);
        c.processes = c.matched_processes ? c.matched_processes.split(',') : (c.processes || ['CNC 밀링']);
        c.materials = c.matched_materials ? c.matched_materials.split(',') : (c.materials || ['SUS304']);
    });
    renderCompanyCards(suppliers);
}

// ===== Electric Vision Flower Generator =====
function createVisionFlower() {
    const flower = document.createElement('div');
    const colorClasses = ['flower-purple', 'flower-gold', 'flower-white'];
    const randomColor = colorClasses[Math.floor(Math.random() * colorClasses.length)];
    
    flower.className = `vision-flower ${randomColor}`;
    flower.innerHTML = '<i class="ri-sun-fill"></i>'; // Lotus-like icon
    
    // Random position
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    
    flower.style.left = x + 'px';
    flower.style.top = y + 'px';
    
    // Random size and duration
    const scale = Math.random() * 0.5 + 0.5;
    flower.style.transform = `scale(${scale})`;
    flower.style.animationDuration = (Math.random() * 4 + 4) + 's';
    
    document.body.appendChild(flower);
    
    // Remove after animation
    setTimeout(() => {
        flower.remove();
    }, 8000);
}

// Start generating vision flowers
setInterval(createVisionFlower, 1200);
