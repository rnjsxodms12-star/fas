// ===== MachHub Supplier App Logic =====

document.addEventListener('DOMContentLoaded', () => {
    // 가입 여부 확인 (시연용: 세션 종료 시 리셋되도록 sessionStorage 사용)
    const isRegistered = sessionStorage.getItem('supplier_registered');
    if (isRegistered) {
        showScreen('work-mgmt');
        document.getElementById('bottom-nav').style.display = 'flex';
    } else {
        showScreen('onboarding');
    }

    startTimer();
    setupOnboarding();
});

function setupOnboarding() {
    // 라디오 카드 클릭 이벤트
    document.querySelectorAll('.radio-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
}

function completeSignup() {
    const bizNameInput = document.getElementById('input-biz-name');
    const bizName = bizNameInput ? bizNameInput.value.trim() : '(주) 마하테크';
    const bizInput = document.getElementById('input-biz-num');
    const bizNum = bizInput ? bizInput.value.replace(/-/g, '') : '';

    // 10자리 자릿수 검증
    if (bizNum.length !== 10 || isNaN(bizNum)) {
        alert('사업자등록번호 10자리를 정확히 입력해주세요.');
        if (bizInput) bizInput.focus();
        return;
    }

    // 선택된 장비 확인
    const selectedEquips = Array.from(document.querySelectorAll('.check-item input:checked')).map(el => {
        return el.parentElement.innerText.trim();
    });
    const primaryEquip = selectedEquips.length > 0 ? selectedEquips[0] : 'CNC 선반/밀링';

    // 장비에 따른 오더 데이터 매핑
    try {
        updateOrderRequest();
    } catch (e) {
        console.error('Order update failed:', e);
    }

    showToast('가입이 완료되었습니다! 맞춤형 오더를 매칭 중입니다.', 'ri-user-heart-line');

    // 상태 저장
    sessionStorage.setItem('supplier_registered', 'true');
    sessionStorage.setItem('supplier_name', bizName);
    sessionStorage.setItem('supplier_biz_num', bizNum);
    sessionStorage.setItem('supplier_equip', primaryEquip);
    sessionStorage.setItem('supplier_equips_all', JSON.stringify(selectedEquips));

    setTimeout(() => {
        const nav = document.getElementById('bottom-nav');
        if (nav) nav.style.display = 'flex';
        showScreen('work-mgmt');

        // 초기 데이터 (주문 탭 비우기 등)
        const sentList = document.getElementById('sent-quotes-list');
        if (sentList) sentList.innerHTML = `<div class="empty-state" style="text-align: center; padding: 60px 20px;"><i class="ri-file-list-line" style="font-size: 3rem; color: var(--border);"></i><p class="mt-4" style="color: var(--text-muted);">발송된 견적이 없습니다.</p></div>`;

        // 5초 후 첫 오더 도착 시뮬레이션
        simulateOrderArrival();
    }, 800);
}

function simulateOrderArrival() {
    const equip = sessionStorage.getItem('supplier_equip') || 'CNC';

    setTimeout(() => {
        showToast('✨ 첫 번째 맞춤 오더가 도착했습니다!', 'ri-magic-line');

        // 하단 탭 알림 표시
        const fab = document.querySelector('.nav-fab');
        if (fab) {
            const dot = document.createElement('div');
            dot.style.cssText = 'position:absolute; top:0; right:0; width:12px; height:12px; background:var(--danger); border:2px solid white; border-radius:50%;';
            fab.style.position = 'relative';
            fab.appendChild(dot);
        }

        // 전체 건수 업데이트 (데모용)
        const statTotal = document.getElementById('stat-total');
        if (statTotal) statTotal.innerText = '1건';
    }, 5000);
}

let orderSequence = [];
let sentQuotes = [];

function generateOrderSequence(primaryEquip) {
    const allOrders = [
        { title: '로봇 브라켓', img: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&q=80&w=200', spec: 'AL6061 | 100 EA | CNC 3축 외', details: ['AL6061', '100 EA', 'CNC 3축 외'], notice: '후처리 샌드블라스트 기본, 치수 공차 ±0.05', category: 'CNC' },
        { title: '알루미늄 프레임', img: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=200', spec: 'AL6061 | 20 EA | TIG 용접', details: ['AL6061', '20 EA', 'TIG 용접'], notice: '용접 비드 일정하게 유지, 누설 검사 필수', category: '용접' },
        { title: '정밀 고정 지그', img: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?auto=format&fit=crop&q=80&w=200', spec: 'AL6061 | 100 EA | 레이저 커팅', details: ['AL6061', '100 EA', '레이저 커팅'], notice: '레이저 커팅 단면 버(Burr) 제거 필수', category: '레이저' },
        { title: '자동차 휠 하우징', img: 'https://images.unsplash.com/photo-1486497395402-741179ad9a39?auto=format&fit=crop&q=80&w=200', spec: 'AL6061 | 50 EA | 후처리/연마', details: ['AL6061', '50 EA', '후처리/연마'], notice: '표면 조도 Ra 0.8 이하, 광택 작업 필수', category: '후처리' },
        { title: '센서 하우징', img: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=200', spec: 'SUS303 | 30 EA | CNC 5축', details: ['SUS303', '30 EA', 'CNC 5축'], notice: '내경 나사 가공 정밀도 중요', category: 'CNC' }
    ];

    let category = 'CNC';
    if (primaryEquip.includes('후처리')) category = '후처리';
    else if (primaryEquip.includes('레이저')) category = '레이저';
    else if (primaryEquip.includes('용접')) category = '용접';

    const matched = allOrders.filter(o => o.category === category);
    const others = allOrders.filter(o => o.category !== category);

    orderSequence = [...matched, ...others];
}

function updateOrderRequest() {
    const equip = sessionStorage.getItem('supplier_equip') || 'CNC';
    const savedIndex = sessionStorage.getItem('current_order_index');
    const currentIndex = savedIndex ? parseInt(savedIndex) : 0;

    if (!orderSequence || orderSequence.length === 0) {
        generateOrderSequence(equip);
    }

    const screenQuote = document.getElementById('screen-quote-input');
    const orderContent = document.getElementById('new-order-content');
    const orderEmpty = document.getElementById('new-order-empty');
    if (!orderContent || !orderEmpty) return;

    if (currentIndex >= orderSequence.length) {
        orderContent.style.display = 'none';
        orderEmpty.style.display = 'block';
        return;
    } else {
        orderContent.style.display = 'block';
        orderEmpty.style.display = 'none';
    }

    const data = orderSequence[currentIndex];

    const nameEl = orderContent.querySelector('.order-name');
    const imgEl = orderContent.querySelector('.order-img');
    const badgeEl = orderContent.querySelector('.badge-blue');
    const details = orderContent.querySelectorAll('.detail-value');
    const notice = orderContent.querySelector('.bg-light p:last-child');

    if (nameEl) nameEl.innerText = data.title;
    if (imgEl) imgEl.src = data.img;
    if (badgeEl) badgeEl.innerText = `AI 적합도 ${92 + (currentIndex % 5)}%`;
    if (details.length >= 3) {
        details[0].innerText = data.details[0];
        details[1].innerText = data.details[1];
        details[2].innerText = data.details[2];
    }
    if (notice) notice.innerText = data.notice;

    const miniName = screenQuote.querySelector('.card p:first-child');
    const miniImg = screenQuote.querySelector('.card img');
    const miniSpec = screenQuote.querySelector('.card p:last-child');

    if (miniName) miniName.innerText = data.title;
    if (miniImg) miniImg.src = data.img;
    if (miniSpec) miniSpec.innerText = data.spec;

    const processGroup = screenQuote.querySelector('#quote-process-group');
    if (processGroup) {
        processGroup.innerHTML = '';
        const processes = getProcessOptions(data.category);
        processes.forEach(p => {
            const label = document.createElement('label');
            label.className = 'check-item';
            label.innerHTML = `<input type="checkbox" ${p.checked ? 'checked' : ''}> ${p.name}`;
            processGroup.appendChild(label);
        });
    }
}

function nextOrder() {
    let currentIndex = parseInt(sessionStorage.getItem('current_order_index') || '0');
    currentIndex++;
    sessionStorage.setItem('current_order_index', currentIndex.toString());
    updateOrderRequest();
    showScreen('new-order');
}

function declineOrder() {
    // 즉시 현재 오더 카드 숨김 (다음 오더 미리보기 방지)
    const content = document.getElementById('new-order-content');
    if (content) content.style.opacity = '0';

    showToast('주문을 거절했습니다. 다음 매칭을 준비합니다.', 'ri-close-circle-line');

    // 약간의 딜레이 후 홈으로 이동
    setTimeout(() => {
        showScreen('work-mgmt');

        // 홈으로 이동한 뒤 백그라운드에서 인덱스 증가 및 데이터 갱신
        const savedIndex = sessionStorage.getItem('current_order_index');
        let currentIndex = savedIndex ? parseInt(savedIndex) : 0;
        currentIndex++;
        sessionStorage.setItem('current_order_index', currentIndex.toString());

        // 다음 진입을 위해 데이터 미리 세팅 (이미 홈으로 왔으므로 사용자에게 안 보임)
        updateOrderRequest();

        // 오더 카드 투명도 복구 (다음 진입 시 정상 노출되도록)
        if (content) content.style.opacity = '1';

        // 1초 뒤 새로운 오더 도착 알림 (파란 불)
        setTimeout(() => {
            showToast('✨ 새로운 맞춤 오더가 추천되었습니다.', 'ri-magic-line');
            const fab = document.querySelector('.nav-fab');
            if (fab && !fab.querySelector('.notification-dot')) {
                const dot = document.createElement('div');
                dot.className = 'notification-dot';
                dot.style.cssText = 'position:absolute; top:0; right:0; width:12px; height:12px; background:var(--danger); border:2px solid white; border-radius:50%;';
                fab.style.position = 'relative';
                fab.appendChild(dot);
            }
        }, 1000);
    }, 400);
}

function getProcessOptions(equip) {
    if (equip.includes('후처리')) {
        return [
            { name: '원자재 점검', checked: true },
            { name: '표면 연마', checked: true },
            { name: '광택 작업', checked: true },
            { name: '최종 세척', checked: false }
        ];
    } else if (equip.includes('레이저')) {
        return [
            { name: '레이저 커팅', checked: true },
            { name: '디버링(Deburring)', checked: true },
            { name: '탭 가공', checked: false },
            { name: '절곡(Bending)', checked: false }
        ];
    } else if (equip.includes('용접')) {
        return [
            { name: '절단', checked: true },
            { name: 'TIG 용접', checked: true },
            { name: '후처리(연마/도장)', checked: true },
            { name: '누설 검사', checked: false },
            { name: '조립', checked: false }
        ];
    } else {
        return [
            { name: 'CNC 3축', checked: true },
            { name: '탭 가공', checked: true },
            { name: '후처리', checked: true }
        ];
    }
}

// ===== 스크린 전환 로직 =====
function showScreen(screenId, navEl) {
    // 모든 스크린 숨기기
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // 대상 스크린 표시
    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.classList.add('active');

    // 헤더 정보 업데이트
    updateHeader(screenId);

    // 네비게이션 아이콘 활성화 상태 변경
    if (navEl) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        navEl.classList.add('active');
    }

    // 화면 전환 시 최상단으로 스크롤
    window.scrollTo(0, 0);

    // 새 주문 확인 시 알림 점 제거 및 데이터 업데이트
    if (screenId === 'new-order') {
        const dot = document.querySelector('.notification-dot');
        if (dot) dot.remove();
        updateOrderRequest();
    }

    // 내 정보 화면 업데이트
    if (screenId === 'profile') {
        updateProfileScreen();
    }

    // 리뷰 데이터 로드
    if (screenId === 'review') {
        loadSupplierReviews();
    }
}

function updateProfileScreen() {
    const name = sessionStorage.getItem('supplier_name') || '(주) 마하테크';
    const num = sessionStorage.getItem('supplier_biz_num') || '000-00-00000';
    const equips = JSON.parse(sessionStorage.getItem('supplier_equips_all') || '["CNC 선반/밀링"]');

    document.getElementById('profile-biz-name').innerText = name;

    // 사업자 번호 포맷팅 (000-00-00000)
    if (num.length === 10) {
        document.getElementById('profile-biz-num').innerText = `사업자번호: ${num.slice(0, 3)}-${num.slice(3, 5)}-${num.slice(5)}`;
    } else {
        document.getElementById('profile-biz-num').innerText = `사업자번호: ${num}`;
    }

    const list = document.getElementById('profile-equip-list');
    if (list) {
        list.innerHTML = '';
        equips.forEach(eq => {
            const span = document.createElement('span');
            span.className = 'process-tag';
            span.style.cssText = 'background: rgba(255,255,255,0.1); color: white; padding: 8px 16px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(4px);';
            span.innerText = eq;
            list.appendChild(span);
        });
    }
}

function showJobDetail(name, spec, stage, due) {
    document.getElementById('detail-job-name').innerText = name;
    document.getElementById('detail-job-spec').innerText = spec;
    document.getElementById('detail-current-stage').innerText = `${stage} 진행 중`;
    document.getElementById('detail-due').innerText = due;

    showScreen('job-detail');
}

function showQuoteDetail(id) {
    const q = sentQuotes.find(item => item.id === id);
    if (!q) return;

    document.getElementById('modal-title').innerText = q.title;
    document.getElementById('modal-price').innerText = q.price + '원';
    document.getElementById('modal-spec').innerText = q.spec;
    document.getElementById('modal-time').innerText = q.time;
    document.getElementById('modal-start-date').innerText = q.startDate;
    document.getElementById('modal-date').innerText = `발송일: ${q.date}`;

    const processesContainer = document.getElementById('modal-processes');
    if (processesContainer) {
        processesContainer.innerHTML = '';
        q.processes.forEach(p => {
            const span = document.createElement('span');
            span.className = 'process-tag';
            span.innerText = p;
            processesContainer.appendChild(span);
        });
    }

    document.getElementById('quote-detail-modal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function updateHeader(screenId) {
    const stepEl = document.getElementById('header-step');
    const titleEl = document.getElementById('header-title');
    const backBtn = document.getElementById('btn-back');

    switch (screenId) {
        case 'onboarding':
            stepEl.style.display = 'none';
            backBtn.style.display = 'none';
            titleEl.innerText = 'MachHub 파트너 가입';
            break;
        case 'new-order':
            stepEl.innerText = '1단계';
            stepEl.style.display = 'inline-block';
            backBtn.style.display = 'block';
            backBtn.onclick = () => showScreen('work-mgmt');
            titleEl.innerText = '새 주문 요청';
            break;
        case 'quote-input':
            stepEl.innerText = '2단계';
            stepEl.style.display = 'inline-block';
            backBtn.style.display = 'block';
            backBtn.onclick = () => showScreen('work-mgmt');
            titleEl.innerText = '견적 입력';
            break;
        case 'work-mgmt':
            stepEl.style.display = 'none';
            backBtn.style.display = 'none';
            titleEl.innerText = 'MachHub 파트너';
            break;
        case 'sent-quotes':
            stepEl.style.display = 'none';
            backBtn.style.display = 'none';
            titleEl.innerText = '주문 현황';
            break;
        case 'job-detail':
            stepEl.style.display = 'none';
            backBtn.style.display = 'block';
            backBtn.onclick = () => showScreen('work-mgmt');
            titleEl.innerText = '작업 상세 현황';
            break;
        case 'profile':
            stepEl.style.display = 'none';
            backBtn.style.display = 'none';
            titleEl.innerText = '내 정보';
            break;
        case 'payment':
            stepEl.style.display = 'none';
            backBtn.style.display = 'none';
            titleEl.innerText = '결제 및 정산';
            break;
        case 'review':
            stepEl.style.display = 'none';
            backBtn.style.display = 'none';
            titleEl.innerText = '리뷰 및 피드백';
            break;
    }
}

// ===== 인터랙션 로직 =====

function rejectOrder() {
    showToast('주문 요청을 거절했습니다.', 'ri-close-circle-line');
    setTimeout(() => showScreen('work-mgmt'), 500);
}

function sendQuote() {
    const screenQuote = document.getElementById('screen-quote-input');
    const price = document.getElementById('quote-price').value;

    // 현재 시퀀스 정보 참조
    const savedIndex = sessionStorage.getItem('current_order_index');
    const currentIndex = savedIndex ? parseInt(savedIndex) : 0;
    const orderData = orderSequence[currentIndex % orderSequence.length];

    // 폼 데이터 수집
    const time = screenQuote.querySelectorAll('input.input-control')[1].value + '시간';
    const startDate = screenQuote.querySelector('input[type="date"]').value;
    const processes = Array.from(screenQuote.querySelectorAll('#quote-process-group input:checked')).map(el => el.parentElement.innerText.trim());

    // 보낸 견적 데이터 생성
    const quoteData = {
        id: Date.now(),
        title: orderData.title,
        price: Number(price).toLocaleString(),
        spec: orderData.spec,
        time: time,
        startDate: startDate,
        processes: processes,
        date: new Date().toLocaleDateString(),
        status: '고객 확인 중'
    };

    sentQuotes.push(quoteData);
    addSentQuote(quoteData);

    showToast(`${quoteData.price}원 견적 발송 완료!`, 'ri-checkbox-circle-fill');

    // 견적 대기 카운트 증가
    const statReady = document.getElementById('stat-ready');
    if (statReady) {
        const currentCount = parseInt(statReady.innerText) || 0;
        statReady.innerText = (currentCount + 1) + '건';
    }

    setTimeout(() => {
        showScreen('sent-quotes');
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.nav-item')[1].classList.add('active');

        // 인덱스 증가
        sessionStorage.setItem('current_order_index', (currentIndex + 1).toString());
        updateOrderRequest();
    }, 1000);
}

function addSentQuote(data) {
    const list = document.getElementById('sent-quotes-list');
    if (!list) return;

    if (list.querySelector('.empty-state')) list.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'job-card';
    card.style.flexDirection = 'column';
    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span class="job-status-badge" style="color:var(--warning)">${data.status}</span>
            <span style="font-size:0.75rem; color:var(--text-muted)">${data.date}</span>
        </div>
        <p style="font-weight:700; font-size:1.1rem; margin-bottom:4px;">${data.title}</p>
        <p style="font-size:1.2rem; font-weight:800; color:var(--primary);">${data.price}원</p>
        <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border); display:flex; justify-content:space-between;">
            <button class="icon-btn" onclick="editQuote('${data.price.replace(/,/g, '')}')" style="font-size:0.85rem; color:var(--text-muted);">견적 수정</button>
            <button class="icon-btn" onclick="showQuoteDetail(${data.id})" style="font-size:0.85rem; color:var(--primary); font-weight:700;">상세 보기</button>
        </div>
    `;
    list.prepend(card);
}

function editQuote(currentPrice) {
    const priceInput = document.getElementById('quote-price');
    if (priceInput) priceInput.value = currentPrice;

    showScreen('quote-input');
    showToast('견적 내용을 수정합니다.', 'ri-edit-line');
}

// ===== 토스트 알림 시스템 =====
function showToast(message, iconClass = 'ri-information-line') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.innerHTML = `<i class="${iconClass}"></i> ${message}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ===== 타이머 로직 (데모용) =====
function startTimer() {
    const timerBox = document.querySelector('.timer-box');
    if (!timerBox) return;

    let totalSeconds = 23 * 3600 + 58 * 60 + 47;

    setInterval(() => {
        totalSeconds--;
        if (totalSeconds < 0) totalSeconds = 0;

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        timerBox.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

// ===== Electric Vision Flower Generator =====
function createVisionFlower() {
    const flower = document.createElement('div');
    const colorClasses = ['flower-purple', 'flower-gold', 'flower-white'];
    const randomColor = colorClasses[Math.floor(Math.random() * colorClasses.length)];
    
    flower.className = `vision-flower ${randomColor}`;
    flower.innerHTML = '<i class="ri-sun-fill"></i>'; 
    
    // Random position
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    
    flower.style.left = x + 'px';
    flower.style.top = y + 'px';
    
    // Random size and duration
    const scale = Math.random() * 0.4 + 0.4;
    flower.style.transform = `scale(${scale})`;
    flower.style.animationDuration = (Math.random() * 4 + 4) + 's';
    
    document.body.appendChild(flower);
    
    // Remove after animation
    setTimeout(() => {
        flower.remove();
    }, 8000);
}

// ===== 리뷰 데이터 로드 (DB 연동) =====
async function loadSupplierReviews() {
    const container = document.getElementById('supplier-review-list');
    if (!container) return;

    try {
        const response = await fetch('https://fas-production-c5f2.up.railway.app/api/reviews');
        const result = await response.json();

        if (result.status === 'success') {
            const reviews = result.data;
            container.innerHTML = '';

            if (reviews.length === 0) {
                container.innerHTML = '<p style="text-align:center; padding:40px; color:var(--text-muted);">등록된 리뷰가 없습니다.</p>';
                return;
            }

            reviews.forEach(review => {
                const stars = '⭐'.repeat(Math.floor(review.rating_overall));
                const card = document.createElement('div');
                card.className = 'card';
                card.style.padding = '16px';
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:700;">${review.buyer_name}</span>
                        <span style="font-size:0.85rem; color:#fbbf24;">${stars} (${review.rating_overall})</span>
                    </div>
                    <p style="font-size:0.9rem; line-height:1.5; color:var(--text-dark);">${review.comment}</p>
                    <div style="margin-top:12px; display:flex; gap:8px;">
                        <span style="font-size:0.75rem; background:#f1f5f9; padding:4px 8px; border-radius:4px; color:var(--text-muted);">품질: ${review.rating_quality}</span>
                        <span style="font-size:0.75rem; background:#f1f5f9; padding:4px 8px; border-radius:4px; color:var(--text-muted);">납기: ${review.rating_delivery}</span>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error("Failed to load reviews:", error);
        container.innerHTML = '<p style="text-align:center; padding:40px; color:var(--danger);">데이터를 불러오지 못했습니다.</p>';
    }
}

// Start generating vision flowers
setInterval(createVisionFlower, 1500);
