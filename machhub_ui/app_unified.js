/**
 * MachHub Unified Demo Logic - Data Rich & Action Oriented (Phase 7 Final)
 */

let state = {
    currentRole: 'landing',
    rfq: {
        id: 'RFQ-001',
        name: 'SUS304 브라켓 100EA',
        status: 'idle',
        step: 1,
        selectedSupplier: '-',
        price: '-',
        material: '-',
        qty: '-',
        process: '-'
    },
    logs: [
        { time: '10:00', text: 'MachHub 플랫폼에 접속했습니다.' },
        { time: '10:05', text: '가공 파트너 신뢰 지수(Trust Index) 시스템이 활성화되었습니다.' }
    ]
};

// --- Action Handler ---
function handleAction(action, data) {
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    switch (action) {
        case 'client_submit':
            state.rfq.status = 'matching';
            state.rfq.step = 2;
            state.rfq.name = 'SUS304 브라켓 100EA';
            state.rfq.material = 'SUS304';
            state.rfq.qty = '100 EA';
            state.rfq.process = 'CNC 밀링';
            addLog(timeStr, '새로운 견적 요청(RFQ-001)이 등록되었습니다.');
            addLog(timeStr, 'AI가 도면에서 재질(SUS304) 및 공정 정보를 추출했습니다.');
            break;
        case 'demo_match_complete':
            state.rfq.status = 'comparison';
            state.rfq.step = 3;
            addLog(timeStr, 'AI 분석 기반 최적 파트너 후보 2곳이 선별되었습니다.');
            break;
        case 'supplier_quote':
            state.rfq.status = 'comparison';
            state.rfq.step = 3;
            addLog(timeStr, '가공업체 A가 상세 견적 및 생산 계획을 제출했습니다.');
            break;
        case 'client_award':
            state.rfq.status = 'awarded';
            state.rfq.step = 4;
            state.rfq.selectedSupplier = data === 1 ? '업체 A' : '업체 B';
            state.rfq.price = data === 1 ? '625만원' : '598만원';
            addLog(timeStr, `고객이 최종 파트너로 ${state.rfq.selectedSupplier}를 선택했습니다.`);
            setTimeout(() => {
                state.rfq.status = 'working';
                addLog(timeStr, '가공 생산이 시작되었습니다. 실시간 현황을 모니터링합니다.');
                render();
            }, 800);
            break;
        case 'supplier_complete':
            state.rfq.status = 'completion_requested';
            state.rfq.step = 5;
            addLog(timeStr, '업체가 작업을 완료하고 최종 수행 확인을 요청했습니다.');
            break;
        case 'client_confirm':
            if (data === 'completed') {
                state.rfq.status = 'confirmed';
                state.rfq.step = 6;
                addLog(timeStr, '고객 승인 완료: 거래가 성공적으로 종료되었습니다.');
            } else {
                state.rfq.status = 'disputed';
                addLog(timeStr, '미수행 평가 접수: 관리자 중재 절차가 시작되었습니다.');
            }
            break;
        case 'admin_resolve':
            state.rfq.status = 'confirmed';
            state.rfq.step = 6;
            addLog(timeStr, `관리자 판정: ${data === 'completed' ? '수행 인정' : '미수행 확정'}으로 종결.`);
            break;
    }

    saveState();
    render();
}

// --- UI Rendering ---
function render() {
    updateLayout();
    if (state.currentRole !== 'landing' && state.currentRole !== 'business-choice') {
        updateDashboard();
    }
}

function updateLayout() {
    const landing = document.getElementById('view-landing');
    const dashboard = document.getElementById('view-dashboard');
    const choice = document.getElementById('view-business-choice');
    const nav = document.getElementById('brand-nav');
    const mainView = document.querySelector('.main-view');

    landing.style.display = 'none';
    dashboard.style.display = 'none';
    dashboard.classList.remove('active');
    choice.style.display = 'none';
    if (nav) nav.style.display = 'none';

    if (state.currentRole === 'landing') {
        landing.style.display = 'block';
        if (nav) nav.style.display = 'flex';
    } else if (state.currentRole === 'business-choice') {
        choice.style.display = 'block';
    } else {
        dashboard.style.display = 'block';
        dashboard.classList.add('active');
        
        document.querySelectorAll('.role-view-inner').forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(`view-${state.currentRole}`);
        if (targetView) targetView.classList.add('active');
        
        const label = document.getElementById('role-mode-label');
        if (state.currentRole === 'client') {
            label.innerText = '발주 고객 모드';
            mainView.style.background = '#f0f7ff';
        } else if (state.currentRole === 'supplier') {
            label.innerText = '가공 업체 모드';
            mainView.style.background = '#f1f5f9';
        } else if (state.currentRole === 'admin') {
            label.innerText = '관리자 통합 모드';
            mainView.style.background = '#f5f3ff';
        }

        document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`btn-role-${state.currentRole}`);
        if (btn) btn.classList.add('active');
    }
}

function updateDashboard() {
    updateHeader();
    updateStepper();
    updateLogs();
    updateAiInsight();
    updateSideSummary();
    renderRoleContent();
}

function updateHeader() {
    const statusMap = {
        idle: '요청 대기', matching: 'AI 분석 중', comparison: '파트너 비교', awarded: '선정 완료',
        working: '가공 진행', completion_requested: '완료 확인', confirmed: '거래 종료', disputed: '분쟁 검토'
    };
    const badge = document.getElementById('header-status-badge');
    badge.innerText = statusMap[state.rfq.status] || '대기';
    badge.style.background = state.rfq.status === 'disputed' ? 'var(--danger)' : 
                             (state.rfq.status === 'confirmed' ? 'var(--success)' : 'var(--primary)');
}

function updateStepper() {
    for (let i = 1; i <= 6; i++) {
        const el = document.getElementById(`step-${i}`);
        if (!el) continue;
        const dot = el.querySelector('.dot');
        el.className = 'step';
        if (i < state.rfq.step) { el.classList.add('done'); dot.innerHTML = '✓'; }
        else if (i === state.rfq.step) { el.classList.add('active'); dot.innerHTML = i; }
        else { dot.innerHTML = i; }
    }
}

function updateSideSummary() {
    const nameEl = document.getElementById('side-summary-name');
    if (nameEl) nameEl.innerText = state.rfq.name;
    const rfqIdEl = document.getElementById('summary-rfq-id');
    if (rfqIdEl) rfqIdEl.innerText = state.rfq.id;
    const supplierEl = document.getElementById('summary-supplier');
    if (supplierEl) supplierEl.innerText = state.rfq.selectedSupplier;
    const priceEl = document.getElementById('summary-price');
    if (priceEl) priceEl.innerText = state.rfq.price;
}

function updateLogs() {
    const container = document.getElementById('activity-log');
    if (!container) return;
    const sorted = [...state.logs].reverse();
    container.innerHTML = sorted.map((log, i) => `
        <div class="log-item ${i === 0 ? 'newest' : ''}">
            <div class="log-time">${log.time}</div>
            <p>${log.text}</p>
        </div>
    `).join('');
}

function updateAiInsight() {
    const insights = {
        idle: '도면을 업로드하면 AI가 재질과 공정을 즉시 분석합니다.',
        matching: 'AI가 최적의 가공 파트너 리스트를 선별하고 있습니다.',
        comparison: '신뢰 지수와 견적 조건을 바탕으로 파트너를 선정하세요.',
        working: '작업이 원활히 진행 중입니다. 파트너의 실시간 보고를 확인하세요.',
        disputed: '분쟁이 접수되었습니다. AI가 데이터 기반 중재 가이드를 생성 중입니다.'
    };
    const insightEl = document.getElementById('ai-insight-text');
    if (insightEl) insightEl.innerText = insights[state.rfq.status] || '처리 중입니다...';
}

function renderRoleContent() {
    const client = document.getElementById('client-content');
    const supplier = document.getElementById('supplier-content');
    const admin = document.getElementById('admin-content');

    if (client) {
        if (state.rfq.status === 'idle') client.innerHTML = getTemplate('tpl-client-form');
        else if (state.rfq.status === 'matching') client.innerHTML = getTemplate('tpl-client-matching');
        else if (state.rfq.status === 'comparison') client.innerHTML = getTemplate('tpl-client-comparison');
        else if (state.rfq.status === 'completion_requested') client.innerHTML = getTemplate('tpl-client-completion');
        else client.innerHTML = `<div class="card p-10 text-center"><i class="ri-checkbox-circle-fill" style="font-size:3rem; color:var(--success);"></i><h3 class="mt-4">거래가 성공적으로 종료되었습니다.</h3></div>`;
    }

    if (supplier) {
        // Supplier always shows mock order list unless they are actively working on the awarded RFQ
        if (state.rfq.status === 'awarded' || state.rfq.status === 'working' || state.rfq.status === 'completion_requested') {
            supplier.innerHTML = getTemplate('tpl-supplier-work');
        } else if (state.rfq.status === 'disputed') {
            supplier.innerHTML = getTemplate('tpl-supplier-dispute');
        } else {
            supplier.innerHTML = getTemplate('tpl-supplier-matching');
        }
    }

    if (admin) {
        admin.innerHTML = getTemplate('tpl-admin-dispute');
    }
}

// --- Navigation ---
function switchRole(role) {
    state.currentRole = role;
    saveState();
    render();
    window.scrollTo(0, 0);
}

function showBusinessChoice() {
    state.currentRole = 'business-choice';
    render();
}

function toggleChat() {
    const m = document.getElementById('ai-chat-modal');
    if (m) m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
}

function addLog(time, text) { state.logs.push({ time, text }); }
function getTemplate(id) { const t = document.getElementById(id); return t ? t.innerHTML : ''; }
function saveState() { localStorage.setItem('machhub_vfinal_state', JSON.stringify(state)); }
function loadState() { const s = localStorage.getItem('machhub_vfinal_state'); if (s) state = JSON.parse(s); }
function resetDemo() { localStorage.removeItem('machhub_vfinal_state'); location.reload(); }

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    render();
});
