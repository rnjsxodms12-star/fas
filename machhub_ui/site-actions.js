(function () {
  const page = location.pathname || '/';

  function textOf(el) {
    if (!el) return '';
    const visible = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    return visible || el.getAttribute('aria-label') || el.getAttribute('title') || '';
  }

  function isPreviewMode() {
    return new URLSearchParams(window.location.search).get('preview') === '1';
  }

  function previewConfig() {
    if (page.includes('supplier')) {
      return {
        role: '가공업체',
        loginLabel: '로그인',
        loginHref: '/',
        signupLabel: '업체 가입',
        signupHref: '/supplier-register'
      };
    }

    if (page.includes('admin')) {
      return {
        role: '관리자',
        loginLabel: '관리자 로그인',
        loginHref: '/',
        signupLabel: '',
        signupHref: ''
      };
    }

    return {
      role: '클라이언트',
      loginLabel: '로그인',
      loginHref: '/',
      signupLabel: '회원가입',
      signupHref: '/client-register'
    };
  }

  function previewChip(label) {
    return `
      <span class="preview-chip" style="display:inline-flex;align-items:center;gap:6px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;white-space:nowrap;">
        <i class="ri-eye-line"></i> ${label} 미리보기
      </span>
    `;
  }

  function previewLinks(config) {
    const signup = config.signupHref
      ? `<a class="btn-primary preview-link" href="${config.signupHref}" style="padding:8px 12px;font-size:12px;text-decoration:none;">${config.signupLabel}</a>`
      : '';
    return `
      <a class="btn-outline preview-link" href="${config.loginHref}" style="padding:8px 12px;font-size:12px;text-decoration:none;">${config.loginLabel}</a>
      ${signup}
    `;
  }

  function applyPreviewActions(container, config, options = {}) {
    if (!container) return;

    container.querySelectorAll('.preview-chip, .preview-link').forEach((item) => item.remove());
    container.querySelectorAll('a, button, span').forEach((item) => {
      const label = textOf(item);
      const isSessionLabel = label.includes('홍길동') || label.includes('로그아웃');
      const isPublicAuth = options.replacePublicAuth && (label === '로그인' || label === '회원가입');
      if (isSessionLabel || isPublicAuth) item.remove();
    });

    container.insertAdjacentHTML('afterbegin', previewChip(config.role));
    container.insertAdjacentHTML('beforeend', previewLinks(config));
  }

  function keepPreviewInRoleLinks() {
    const previewFiles = new Set([
      '/client',
      '/client-fulfillment',
      '/supplier',
      '/supplier-workbench',
      '/supplier-messages',
      '/supplier-settings',
      '/supplier-rfq-detail',
      '/admin-control-center'
    ]);

    document.querySelectorAll('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const [beforeHash, hash = ''] = href.split('#');
      const [filePart, query = ''] = beforeHash.split('?');
      const fileName = filePart.split('/').pop();
      if (!previewFiles.has(fileName)) return;

      const params = new URLSearchParams(query);
      params.set('preview', '1');
      link.setAttribute('href', `${filePart}?${params.toString()}${hash ? `#${hash}` : ''}`);
    });
  }

  function initPreviewMode() {
    if (!isPreviewMode()) return;

    document.body.classList.add('preview-mode');
    const config = previewConfig();
    applyPreviewActions(document.querySelector('.header-actions'), config, { replacePublicAuth: true });
    applyPreviewActions(document.querySelector('.mw-actions'), config);
    applyPreviewActions(document.querySelector('.topbar-actions'), config);
    keepPreviewInRoleLinks();
  }

  function ensureToastHost() {
    let host = document.querySelector('.demo-toast-host');
    if (host) return host;

    host = document.createElement('div');
    host.className = 'demo-toast-host';
    host.style.cssText = [
      'position:fixed',
      'right:20px',
      'bottom:20px',
      'z-index:99999',
      'display:flex',
      'flex-direction:column',
      'gap:8px',
      'max-width:min(360px,calc(100vw - 40px))'
    ].join(';');
    document.body.appendChild(host);
    return host;
  }

  function toast(message, type = 'info') {
    window.__immaActionLog = window.__immaActionLog || [];
    window.__immaActionLog.push({ message, type, time: Date.now() });

    const colors = {
      info: ['#fff', '#111827', '#e5e7eb'],
      success: ['#ecfdf5', '#047857', '#bbf7d0'],
      warning: ['#fffbeb', '#92400e', '#fde68a'],
      danger: ['#fef2f2', '#991b1b', '#fecaca']
    };
    const color = colors[type] || colors.info;
    const item = document.createElement('div');
    item.className = 'demo-toast';
    item.style.cssText = [
      `background:${color[0]}`,
      `color:${color[1]}`,
      `border:1px solid ${color[2]}`,
      'border-radius:8px',
      'box-shadow:0 10px 24px rgba(15,23,42,.14)',
      'padding:12px 14px',
      'font-size:13px',
      'font-weight:800',
      'line-height:1.45'
    ].join(';');
    item.textContent = message;
    ensureToastHost().appendChild(item);

    window.setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(8px)';
      item.style.transition = 'opacity .2s ease, transform .2s ease';
      window.setTimeout(() => item.remove(), 220);
    }, 2400);
  }

  function demoStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function demoStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // File URL storage can be restricted in some browsers; the UI still works as a static demo.
    }
  }

  function supplierReplySent() {
    return demoStorageGet('immaDemoSupplierReplySent') === '1';
  }

  function productionShared() {
    return demoStorageGet('immaDemoProductionShared') === '1';
  }

  function clientPaid() {
    const params = new URLSearchParams(window.location.search);
    return params.get('status') === 'paid' || demoStorageGet('immaDemoClientPaid') === '1';
  }

  function findStatusBadge(el) {
    const scope = el.closest('tr, .message-row, .mw-list-item, .order-row, .mw-card, .card, .card-panel') || document;
    return scope.querySelector('.mw-badge, .badge');
  }

  function setStatus(el, label, tone = 'green') {
    const badge = findStatusBadge(el);
    if (!badge || badge.closest('button')) return;

    badge.textContent = label;
    if (badge.classList.contains('mw-badge')) {
      badge.className = `mw-badge ${tone}`;
    } else {
      badge.className = `badge badge-${tone}`;
    }
  }

  function completeButton(btn, label) {
    if (!btn || btn.dataset.keepActive === 'true') return;
    btn.dataset.demoDone = 'true';
    if (label) btn.innerHTML = label;
    btn.style.opacity = '0.82';
  }

  function activateWithin(btn, selector) {
    const scope = btn.closest('.card, .mw-card, .filter-bar, .filter-inner, .sort-btn, .pagination, .order-prog-tabs') || btn.parentElement || document;
    scope.querySelectorAll(selector).forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');
  }

  function ensureDetailPanel() {
    let panel = document.querySelector('.demo-detail-panel');
    if (panel) return panel;

    panel = document.createElement('aside');
    panel.className = 'demo-detail-panel';
    panel.style.cssText = [
      'position:fixed',
      'right:20px',
      'top:88px',
      'z-index:99990',
      'width:min(380px,calc(100vw - 40px))',
      'max-height:calc(100vh - 120px)',
      'overflow:auto',
      'background:#fff',
      'border:1px solid #dbe3ef',
      'border-radius:12px',
      'box-shadow:0 20px 46px rgba(15,23,42,.18)',
      'padding:18px'
    ].join(';');
    document.body.appendChild(panel);
    return panel;
  }

  function showDetailPanel(title, lines) {
    const panel = ensureDetailPanel();
    const detailLines = lines.filter(Boolean).map((line) => `<li>${line}</li>`).join('');
    panel.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;">
        <div>
          <div style="font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:4px;">상세 정보</div>
          <h3 style="margin:0;font-size:18px;line-height:1.35;color:#111827;">${title}</h3>
        </div>
        <button type="button" aria-label="상세 정보 닫기" class="demo-detail-close" style="border:1px solid #e5e7eb;background:#fff;border-radius:8px;width:34px;height:34px;cursor:pointer;font-size:18px;">×</button>
      </div>
      <ul style="margin:0;padding-left:18px;color:#334155;font-size:13px;line-height:1.7;">${detailLines}</ul>
    `;
    panel.querySelector('.demo-detail-close').addEventListener('click', () => panel.remove());
  }

  function supplierDetailFrom(btn) {
    const supplierRow = btn.closest('.supplier-row');
    if (supplierRow) {
      const name = textOf(supplierRow.querySelector('.s-info h4')).replace(/AI\s*\d+%/g, '').trim() || '추천 업체';
      const rating = textOf(supplierRow.querySelector('.s-rating'));
      const price = textOf(supplierRow.querySelector('.s-price'));
      const days = textOf(supplierRow.querySelector('.s-days'));
      const equip = textOf(supplierRow.querySelector('.s-equip'));
      showDetailPanel(name, [
        rating && `리뷰·평점: ${rating}`,
        price && `예상 금액: ${price}`,
        days && `예상 납기: ${days}`,
        equip && `보유 장비: ${equip}`,
        '선택하면 발주·계약·결제 단계에서 해당 업체 기준으로 진행됩니다.'
      ]);
      return true;
    }

    const companyCard = btn.closest('.company-card, .sup-card');
    if (companyCard) {
      const name = textOf(companyCard.querySelector('.company-name, .sup-title')) || '가공업체';
      showDetailPanel(name, [
        textOf(companyCard.querySelector('.company-loc, .sup-loc')),
        textOf(companyCard.querySelector('.company-tags, .sup-tags')),
        textOf(companyCard.querySelector('.company-stats, .sup-meta')),
        '상세 견적 비교는 견적 요청 후 매칭 화면에서 진행됩니다.'
      ]);
      return true;
    }

    const rfqSummary = btn.closest('.rfq-summary-card');
    if (rfqSummary) {
      showDetailPanel('견적 요청 요약', [
        textOf(rfqSummary),
        '도면, 수량, 납기, 수령 방식 보완 여부를 확인한 뒤 업체 비교로 이어집니다.'
      ]);
      return true;
    }

    return false;
  }

  async function copyNearButton(btn) {
    const target = btn.closest('.meta-value, .mw-list-item, td, div') || btn.parentElement;
    const text = textOf(target).replace(textOf(btn), '').trim();
    try {
      await navigator.clipboard.writeText(text);
      toast('복사했습니다.', 'success');
    } catch (error) {
      toast(text ? `복사할 내용: ${text}` : '복사할 내용을 찾지 못했습니다.', 'info');
    }
  }

  function openFilePicker(label) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const count = input.files ? input.files.length : 0;
      toast(count ? `${label} ${count}개가 첨부되었습니다.` : '파일 선택을 취소했습니다.', count ? 'success' : 'warning');
      input.remove();
    });
    input.click();
  }

  function routeFromContext(text) {
    if (text.includes('목록으로')) {
      location.href = page.includes('supplier') ? '/supplier' : '/client';
      return true;
    }

    if (text.includes('로그인하기')) {
      const title = document.getElementById('login-title');
      const isSupplierLogin = title && title.textContent.includes('가공업체');
      toast(isSupplierLogin ? '가공업체 대시보드로 이동합니다.' : '클라이언트 대시보드로 이동합니다.', 'success');
      window.setTimeout(() => {
        location.href = isSupplierLogin ? '/supplier' : '/client';
      }, 250);
      return true;
    }

    if (text.includes('가입하기')) {
      demoStorageSet('immaDemoProductionShared', '0');
      demoStorageSet('immaDemoSupplierReplySent', '0');
      demoStorageSet('immaDemoClientPaid', '0');
      toast('고객 가입이 완료되었습니다. 대시보드로 이동합니다.', 'success');
      window.setTimeout(() => { location.href = '/client'; }, 250);
      return true;
    }

    if (text.includes('기업회원 가입 완료')) {
      toast('가공업체 가입이 완료되었습니다. 대시보드로 이동합니다.', 'success');
      window.setTimeout(() => { location.href = '/supplier'; }, 250);
      return true;
    }

    if (text.includes('결제하기')) {
      demoStorageSet('immaDemoClientPaid', '1');
      demoStorageSet('immaDemoProductionShared', '0');
      toast('결제 대행 절차를 시작합니다.', 'success');
      completeButton(document.activeElement, '<i class="ri-loader-4-line ri-spin"></i> 결제 처리중');
      window.setTimeout(() => { location.href = '/payment-success'; }, 350);
      return true;
    }

    return false;
  }

  function handleRegisterButtons(btn, text) {
    if (text.includes('PASS 인증')) {
      const passMsg = document.getElementById('pass-success-msg');
      if (passMsg) passMsg.style.display = 'block';
      toast('PASS 인증 요청을 완료했습니다.', 'success');
      btn.textContent = '인증 완료';
      btn.style.background = 'var(--success)';
      btn.style.color = '#fff';
      return true;
    }

    if (text === '인증') {
      toast('사업자등록번호 인증을 완료했습니다.', 'success');
      completeButton(btn, '인증 완료');
      return true;
    }

    if (text.includes('중복 확인')) {
      toast('사용 가능한 이메일입니다.', 'success');
      completeButton(btn, '확인 완료');
      return true;
    }

    return false;
  }

  function handleSearchAndFilters(btn, text) {
    if (btn.classList.contains('filter-pill') || btn.classList.contains('filter-btn') || btn.classList.contains('filter-dropdown')) {
      activateWithin(btn, 'button');
      toast(text.includes('초기화') ? '검색 조건을 초기화했습니다.' : `${text} 조건을 적용했습니다.`, text.includes('초기화') ? 'info' : 'success');
      return true;
    }

    if (btn.classList.contains('page-btn') || btn.classList.contains('pg-btn') || /^[0-9]+$/.test(text)) {
      activateWithin(btn, 'button');
      const message = text.includes('페이지') ? `${text}로 이동했습니다.` : (text ? `${text}페이지로 이동했습니다.` : '페이지를 이동했습니다.');
      toast(message, 'info');
      return true;
    }

    if (text.includes('검색') || text.includes('필터') || text.includes('초기화')) {
      toast(text.includes('초기화') ? '검색 조건을 초기화했습니다.' : '검색 조건을 적용했습니다.', 'success');
      return true;
    }

    return false;
  }

  function handleSelection(btn, text) {
    if (text.includes('선택')) {
      const selectedRow = btn.closest('.supplier-row');
      if (selectedRow) {
        document.querySelectorAll('.supplier-row').forEach((row) => {
          row.classList.remove('selected');
          const checkbox = row.querySelector('input[type="checkbox"]');
          if (checkbox) checkbox.checked = false;
          row.querySelectorAll('button').forEach((candidate) => {
            if (!textOf(candidate).includes('선택')) return;
            candidate.classList.remove('btn-primary');
            candidate.classList.add('btn-outline');
            candidate.textContent = '□ 선택';
            candidate.style.background = '';
            candidate.style.color = '';
          });
        });
        selectedRow.classList.add('selected');
        const checkbox = selectedRow.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = true;
        const compareTitle = document.querySelector('.compare-title span');
        if (compareTitle) compareTitle.textContent = '(1/3 선택됨)';
      }
      const table = btn.closest('table, .card, .mw-card') || document;
      table.querySelectorAll('button').forEach((candidate) => {
        const candidateText = textOf(candidate);
        if (!candidateText.includes('선택')) return;
        candidate.classList.remove('btn-primary');
        candidate.classList.add('btn-outline');
        if (!candidateText.includes('상세')) candidate.textContent = '□ 선택';
        candidate.style.background = '';
        candidate.style.color = '';
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');
      btn.textContent = '✓ 선택됨';
      setStatus(btn, '선택 완료', 'green');
      toast('최종 후보 업체로 선택했습니다.', 'success');
      return true;
    }
    return false;
  }

  function setIssueStatus(row, label, tone) {
    const statusBadge = row && row.cells && row.cells[6] ? row.cells[6].querySelector('.mw-badge, .badge') : null;
    if (!statusBadge) return;
    statusBadge.textContent = label;
    if (statusBadge.classList.contains('mw-badge')) {
      statusBadge.className = `mw-badge ${tone}`;
    } else {
      statusBadge.className = `badge badge-${tone}`;
    }
  }

  function issueRowDetails(row) {
    const cells = Array.from(row.cells || []).map((cell) => textOf(cell));
    return {
      id: cells[0] || '문의 접수',
      source: cells[1] || '',
      type: cells[2] || '',
      order: cells[3] || '',
      body: cells[4] || '',
      priority: cells[5] || '',
      status: cells[6] || ''
    };
  }

  function showIssuePanel(row) {
    const issue = issueRowDetails(row);
    showDetailPanel(`${issue.id} 처리 상세`, [
      issue.source && `접수자: ${issue.source}`,
      issue.type && `유형: ${issue.type}`,
      issue.order && `연결 발주: ${issue.order}`,
      issue.priority && `우선순위: ${issue.priority}`,
      issue.status && `현재 상태: ${issue.status}`,
      issue.body && `문의 내용: ${issue.body}`,
      '발송 지연, AS 요청, 품질 문서는 발주 단계와 정산 보류 여부를 함께 확인합니다.'
    ]);
  }

  function filterAdminIssues(btn) {
    const card = btn.closest('#issues');
    if (!card) return false;

    const filter = btn.dataset.issueFilter || 'all';
    const rows = Array.from(card.querySelectorAll('tbody tr[data-issue-type]'));
    let visibleCount = 0;

    rows.forEach((row) => {
      const matches = filter === 'all'
        || row.dataset.issueSource === filter
        || row.dataset.issueType === filter;
      row.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    card.querySelectorAll('.issue-filter').forEach((candidate) => {
      candidate.classList.toggle('btn-primary', candidate === btn);
      candidate.classList.toggle('btn-outline', candidate !== btn);
    });

    toast(`${textOf(btn)} 기준으로 ${visibleCount}건을 표시했습니다.`, 'success');
    return true;
  }

  function handleAdminIssueButton(btn, text) {
    if (btn.classList.contains('issue-filter')) return filterAdminIssues(btn);

    const row = btn.closest('tr[data-issue-type]');
    if (!row) return false;

    const issue = issueRowDetails(row);
    if (text.includes('담당자 배정')) {
      setIssueStatus(row, '담당자 배정 완료', 'blue');
      toast(`${issue.id} 건에 담당자를 배정했습니다.`, 'success');
      completeButton(btn, '배정 완료');
      return true;
    }

    if (text.includes('클라이언트 알림')) {
      setIssueStatus(row, '클라이언트 알림 완료', 'green');
      toast(`${issue.id} 발송 지연 내용을 클라이언트에게 알렸습니다.`, 'success');
      completeButton(btn, '알림 완료');
      return true;
    }

    if (text.includes('답변 작성')) {
      setIssueStatus(row, '답변 작성중', 'blue');
      showIssuePanel(row);
      toast(`${issue.id} 답변 초안 패널을 열었습니다.`, 'info');
      return true;
    }

    if (text.includes('상세 보기')) {
      showIssuePanel(row);
      toast(`${issue.id} 상세 내용을 열었습니다.`, 'info');
      return true;
    }

    return false;
  }

  function handleActionButton(btn, event) {
    const text = textOf(btn);

    if (routeFromContext(text)) return;
    if (handleRegisterButtons(btn, text)) return;
    if (handleSearchAndFilters(btn, text)) return;
    if (handleSelection(btn, text)) return;
    if (handleAdminMatchingButton(btn, text)) return;
    if (btn.closest('#issues') && handleAdminIssueButton(btn, text)) return;

    if (!text) {
      toast('해당 컨트롤을 실행했습니다.', 'info');
      return;
    }

    if (btn.classList.contains('copy-btn') || text.includes('복사')) {
      copyNearButton(btn);
      return;
    }

    if (text.includes('파일 선택') || text.includes('파일 첨부') || text.includes('사진 첨부') || text.includes('업로드')) {
      openFilePicker(text.replace(/[+]/g, '').trim());
      return;
    }

    if (text.includes('다운로드')) {
      toast('발주 자료 다운로드를 준비했습니다.', 'success');
      completeButton(btn);
      return;
    }

    if (text.includes('영수증 출력')) {
      window.print();
      return;
    }

    if (page === '/order-management' && text.includes('생산 공유 상태 새로고침')) {
      syncOrderProductionState();
      toast(productionShared()
        ? '업체가 공유한 생산 진행도 65%를 반영했습니다.'
        : '아직 업체 생산 진행도 공유 전입니다.', productionShared() ? 'success' : 'info');
      return;
    }

    if (text.includes('새로고침')) {
      toast('최신 운영 상태로 갱신했습니다.', 'success');
      return;
    }

    if (text.includes('상세 보기')) {
      if (page === '/client') {
        location.href = '/order-management';
      } else if (supplierDetailFrom(btn)) {
        toast('상세 정보를 열었습니다.', 'info');
      } else {
        toast('상세 정보를 확인할 수 있도록 패널을 준비했습니다.', 'info');
      }
      return;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      toast(`${text} 기준 운영 데이터를 보고 있습니다.`, 'info');
      return;
    }

    if (text.includes('납품 인증 체크') || text.includes('검수 승인')) {
      document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        if (!checkbox.disabled) checkbox.checked = true;
      });
      setStatus(btn, '검수 승인', 'green');
      toast('납품 인증 체크가 저장되었습니다. 정산 단계로 전달됩니다.', 'success');
      completeButton(btn, '<i class="ri-check-line"></i> 승인 완료');
      return;
    }

    if (text === '입력' || text === '보완') {
      setStatus(btn, text === '입력' ? '입력 완료' : '보완 요청', text === '입력' ? 'green' : 'yellow');
      toast(text === '입력' ? '누락 정보를 입력했습니다.' : '보완 요청을 등록했습니다.', 'success');
      completeButton(btn, text === '입력' ? '입력 완료' : '요청 완료');
      return;
    }

    if (text.includes('문의 등록')) {
      setStatus(btn, '문의 등록', 'blue');
      toast('AS/질문 문의가 관리자와 업체에 등록되었습니다.', 'success');
      completeButton(btn, '<i class="ri-check-line"></i> 등록 완료');
      return;
    }

    if (text.includes('리뷰 등록') || text.includes('평점 등록')) {
      setStatus(btn, '리뷰 등록 완료', 'green');
      toast('리뷰와 평점이 저장되었습니다.', 'success');
      completeButton(btn, '<i class="ri-star-fill"></i> 등록 완료');
      return;
    }

    if (text === '수락' || text.includes('발주 확인 수락') || text.includes('최종 발주 수락')) {
      setStatus(btn, '수락 완료', 'green');
      toast('오더리스트를 수락했습니다. 작업정보 회신 단계로 이어집니다.', 'success');
      completeButton(btn, '수락 완료');
      if (page === '/supplier-workbench') {
        window.setTimeout(() => {
          const targetHash = text.includes('최종 발주 수락') || text.includes('발주 확인 수락') ? '#production' : '#reply';
          const target = document.getElementById(targetHash.slice(1));
          if (!target) return;
          history.pushState(null, '', targetHash);
          applySectionFocus(targetHash);
          target.scrollIntoView({ block: 'start', behavior: 'smooth' });
          syncHashNav(targetHash);
        }, 350);
      }
      return;
    }

    if (text.includes('정보 요청') || text.includes('관리자에게 요청')) {
      setStatus(btn, '정보 요청중', 'yellow');
      toast('관리자에게 추가 정보 요청을 보냈습니다.', 'success');
      completeButton(btn, '요청 완료');
      return;
    }

    if (text.includes('임시 저장')) {
      toast('작성 중인 작업정보를 임시 저장했습니다.', 'success');
      return;
    }

    if (text.includes('작업정보 발송') || text.includes('견적 회신')) {
      demoStorageSet('immaDemoSupplierReplySent', '1');
      demoStorageSet('immaDemoSupplierReplyAt', new Date().toISOString());
      setStatus(btn, '회신 완료', 'green');
      toast('예상 납기와 금액을 관리자에게 발송했습니다.', 'success');
      completeButton(btn, '<i class="ri-check-line"></i> 발송 완료');
      if (page === '/supplier-workbench') {
        window.setTimeout(() => {
          const orders = document.getElementById('orders');
          if (!orders) return;
          history.pushState(null, '', '#orders');
          applySectionFocus('#orders');
          orders.scrollIntoView({ block: 'start', behavior: 'smooth' });
          syncHashNav('#orders');
        }, 350);
      }
      return;
    }

    if (text === '전송' || text.includes('답장') || text.includes('답장 전송')) {
      setStatus(btn, '답변 완료', 'green');
      toast('메시지를 전송했습니다.', 'success');
      completeButton(btn, text.includes('답장') ? '전송 완료' : undefined);
      return;
    }

    if (text.includes('읽음 처리')) {
      setStatus(btn, '확인 완료', 'green');
      toast('미확인 메시지를 읽음 처리했습니다.', 'success');
      completeButton(btn, '<i class="ri-check-line"></i> 처리 완료');
      return;
    }

    if (text.includes('오늘 알림 발송')) {
      toast('보완 요청, 검수 승인, 납기 지연 알림을 발송했습니다.', 'success');
      completeButton(btn, '<i class="ri-check-line"></i> 알림 발송 완료');
      return;
    }

    if (text.includes('AI 원문 보기')) {
      toast('AI가 감지한 누락 치수와 입력 누락 항목을 확인했습니다.', 'info');
      return;
    }

    if (text.includes('보완 요청 발송')) {
      setStatus(btn, '요청 발송', 'blue');
      toast('클라이언트에게 AI 보완 요청을 발송했습니다.', 'success');
      completeButton(btn, '<i class="ri-check-line"></i> 요청 발송');
      return;
    }

    if (text.includes('후보 재선별')) {
      toast('가공 종류, 재질, 크기, 스케줄 기준으로 후보 업체를 다시 선별했습니다.', 'success');
      return;
    }

    if (text.includes('오더리스트 발송')) {
      setStatus(btn, '발송 완료', 'green');
      toast('선별 업체에 오더리스트를 발송했습니다.', 'success');
      completeButton(btn, '<i class="ri-check-line"></i> 발송 완료');
      return;
    }

    if (text === '전달' || text.includes('알림') || text.includes('송금 요청')) {
      setStatus(btn, '처리 완료', 'green');
      toast(`${text} 처리를 완료했습니다.`, 'success');
      completeButton(btn, '완료');
      return;
    }

    if (text.includes('검토하기')) {
      setStatus(btn, '검토중', 'blue');
      toast('요청 상세 검토 패널을 열었습니다.', 'info');
      return;
    }

    if (text.includes('승인') || text.includes('반려')) {
      setStatus(btn, text.includes('반려') ? '반려' : '승인 완료', text.includes('반려') ? 'red' : 'green');
      toast(`${text} 처리했습니다.`, text.includes('반려') ? 'warning' : 'success');
      completeButton(btn, '처리 완료');
      return;
    }

    if (text.includes('생산 이벤트 등록') || text.includes('진행도 공유')) {
      demoStorageSet('immaDemoProductionShared', '1');
      setStatus(btn, '진행도 공유', 'blue');
      toast('생산 진행 이벤트를 클라이언트 화면에 공유했습니다.', 'success');
      return;
    }

    if (text.includes('납기 지연')) {
      setStatus(btn, '지연 검토', 'red');
      toast('납기 지연 서비스 요청이 관리자 검토 큐에 등록되었습니다.', 'warning');
      return;
    }

    if (text.includes('납품 정보 발송')) {
      setStatus(btn, '납품 정보 발송', 'green');
      toast('최종 상태 이미지와 배송 정보를 클라이언트에게 전달했습니다.', 'success');
      completeButton(btn, '<i class="ri-check-line"></i> 발송 완료');
      return;
    }

    if (text.includes('배송 정보 업데이트')) {
      setStatus(btn, '배송 업데이트', 'blue');
      toast('배송 현황을 업데이트했습니다.', 'success');
      return;
    }

    if (text.includes('검수 준비 체크리스트')) {
      toast('자체 QC와 납품 인증 체크 항목을 확인했습니다.', 'info');
      return;
    }

    if (text.includes('변경 저장')) {
      setStatus(btn, '저장 완료', 'green');
      toast('설정 변경사항을 저장했습니다.', 'success');
      completeButton(btn, '<i class="ri-check-line"></i> 저장 완료');
      return;
    }

    if (text.includes('알림 테스트')) {
      toast('테스트 알림을 발송했습니다.', 'success');
      return;
    }

    if (text.includes('휴무 등록')) {
      setStatus(btn, '휴무 반영', 'yellow');
      toast('휴무 계획을 작업 스케줄에 반영했습니다.', 'success');
      return;
    }

    toast(`${text} 기능을 실행했습니다.`, 'info');
  }

  function handleDeadLink(link, event) {
    if (link.getAttribute('onclick')) return;
    const href = link.getAttribute('href');
    if (href !== '#') return;

    event.preventDefault();
    const text = textOf(link);
    const routes = [
      ['로그인', '/'],
      ['회원가입', '/'],
      ['대시보드', page.includes('supplier') ? '/supplier' : '/client'],
      ['발주', '/order-management'],
      ['견적', '/quote-request'],
      ['업체', '/search-suppliers'],
      ['리뷰', '/admin-control-center#reviews'],
      ['정산', '/admin-control-center#delivery'],
      ['설정', page.includes('supplier') ? '/supplier-settings' : '/admin-control-center']
    ];
    const route = routes.find(([label]) => text.includes(label));
    if (route) {
      location.href = route[1];
      return;
    }
    toast(text ? `${text} 페이지는 준비 중입니다.` : '준비 중인 링크입니다.', 'info');
  }

  function syncPageNav() {
    const pageName = page.toLowerCase();
    document.querySelectorAll('.dash-nav a, .mw-side-nav a, .admin-unified-nav a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;
      const hrefPage = href.split('#')[0].toLowerCase();
      if (hrefPage !== pageName) return;

      const nav = link.closest('.dash-nav, .mw-side-nav, .admin-unified-nav');
      if (nav) {
        nav.querySelectorAll('a').forEach((item) => {
          const itemHref = item.getAttribute('href') || '';
          if (!itemHref.startsWith('#')) item.classList.remove('active');
        });
      }
      link.classList.add('active');
    });
  }

  function syncHashNav(hash) {
    const currentHash = hash || window.location.hash;
    if (!currentHash || currentHash === '#') return;

    document.querySelectorAll('.mw-side-nav, .guide-nav, .admin-unified-nav').forEach((nav) => {
      const targetLink = nav.querySelector(`a[href="${currentHash}"]`);
      if (!targetLink) return;

      nav.querySelectorAll('a[href^="#"]').forEach((link) => link.classList.remove('active'));
      targetLink.classList.add('active');
    });
  }

  function shouldUseSectionFocus() {
    const publicScrollPages = new Set([
      '/',
      '/how-to-use',
      '/process-flow',
      '/matching-ui',
      '/search-suppliers',
      '/client-fulfillment'
    ]);
    if (publicScrollPages.has(page)) return false;
    return page === '/admin-control-center'
      || Boolean(document.querySelector('.mw-side-nav, .admin-unified-nav'));
  }

  function sectionFocusTarget(hash = window.location.hash) {
    if (!hash || hash === '#') return null;
    const target = document.getElementById(hash.slice(1));
    if (!target) return null;
    return target.closest('.mw-card') || (target.classList.contains('mw-card') ? target : null);
  }

  function sectionFocusCards() {
    return Array.from(document.querySelectorAll('.mw-app-content .mw-card, .mw-page .mw-card'))
      .filter((card) => !card.closest('.scenario-panel'));
  }

  function applySectionFocus(hash = window.location.hash) {
    if (!shouldUseSectionFocus()) return;

    const cards = sectionFocusCards();
    const targetCard = sectionFocusTarget(hash);

    cards.forEach((card) => {
      card.hidden = false;
      card.classList.remove('section-focus-target');
    });

    if (!targetCard || !cards.includes(targetCard)) {
      document.body.classList.remove('section-focus-mode');
      return;
    }

    document.body.classList.add('section-focus-mode');
    cards.forEach((card) => {
      const shouldShow = card === targetCard || targetCard.contains(card) || card.contains(targetCard);
      card.hidden = !shouldShow;
      card.classList.toggle('section-focus-target', shouldShow);
    });
  }

  function syncHashNavByScroll() {
    const navs = document.querySelectorAll('.mw-side-nav, .guide-nav, .admin-unified-nav');
    if (!navs.length) return;
    if (document.body.classList.contains('section-focus-mode')) return;

    navs.forEach((nav) => {
      const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
      if (!links.length) return;

      const visibleSections = links
        .map((link) => {
          const id = link.getAttribute('href').slice(1);
          const section = document.getElementById(id);
          if (!section) return null;
          return { link, section, top: section.getBoundingClientRect().top };
        })
        .filter(Boolean)
        .filter((item) => item.top <= 140);

      if (!visibleSections.length) return;

      const current = visibleSections.reduce((best, item) => (item.top > best.top ? item : best));
      links.forEach((link) => link.classList.remove('active'));
      current.link.classList.add('active');
    });
  }

  function initHashNav() {
    syncPageNav();
    applySectionFocus();
    syncHashNav();

    document.querySelectorAll('.mw-side-nav a[href^="#"], .guide-nav a[href^="#"], .admin-unified-nav a[href^="#"], .scenario-panel a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const hash = link.getAttribute('href');
        const target = hash ? document.getElementById(hash.slice(1)) : null;
        if (!target) return;

        event.preventDefault();
        history.pushState(null, '', hash);
        applySectionFocus(hash);
        target.scrollIntoView({ block: 'start', behavior: 'smooth' });
        syncHashNav(hash);
        if (page === '/admin-control-center' && hash === '#matching') {
          window.__immaAdminMatchingClicks = (window.__immaAdminMatchingClicks || 0) + 1;
          window.setTimeout(applyAdminMatchingScenario, 50);
        }
      });
    });

    window.addEventListener('hashchange', () => {
      applySectionFocus();
      syncHashNav();
      if (page === '/admin-control-center' && window.location.hash === '#matching') {
        applyAdminMatchingScenario();
      }
    });
    window.addEventListener('scroll', () => {
      window.requestAnimationFrame(syncHashNavByScroll);
    }, { passive: true });
    document.querySelectorAll('.mw-app-main').forEach((scroller) => {
      scroller.addEventListener('scroll', () => {
        window.requestAnimationFrame(syncHashNavByScroll);
      }, { passive: true });
    });
  }

  function applyScenarioDemo() {
    if (!document.body || document.body.dataset.scenarioDemoApplied === 'true') return;
    document.body.dataset.scenarioDemoApplied = 'true';

    const demoFiles = new Set([
      '/client',
      '/client-register',
      '/quote-request',
      '/client-fulfillment',
      '/matching-ui',
      '/order-management',
      '/supplier',
      '/supplier-rfq-detail',
      '/supplier-workbench',
      '/supplier-messages',
      '/supplier-settings',
      '/admin-control-center',
      '/admin-ui',
      '/admin-operations'
    ]);
    if (!demoFiles.has(page)) return;

    ensureScenarioStyles();
    applyScenarioTextReplacements();
    applyScenarioHeader();

    if (page === '/client') applyClientDashboardScenario();
    if (page === '/client-register') applyClientRegisterScenario();
    if (page === '/quote-request') applyQuoteScenario();
    if (page === '/client-fulfillment') applyClientFulfillmentScenario();
    if (page === '/matching-ui') applyMatchingScenario();
    if (page === '/order-management') applyOrderScenario();
    if (page === '/supplier') applySupplierDashboardScenario();
    if (page === '/supplier-rfq-detail') applySupplierDetailScenario();
    if (page === '/supplier-workbench') applySupplierWorkbenchScenario();
    if (page === '/admin-control-center') applyAdminScenario();

    appendScenarioDemoFacts();
  }

  function ensureScenarioStyles() {
    if (document.getElementById('scenario-demo-style')) return;
    const style = document.createElement('style');
    style.id = 'scenario-demo-style';
    style.textContent = `
      .scenario-panel{border:1px solid #dbe3ef;background:#fff;border-radius:12px;padding:18px 20px;margin:0 0 22px;box-shadow:0 10px 24px rgba(15,23,42,.06)}
      .scenario-panel.compact{padding:14px 16px;margin-bottom:16px}
      .scenario-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
      .scenario-kicker{font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px}
      .scenario-title{margin:0;font-size:20px;font-weight:900;color:#111827;line-height:1.35}
      .scenario-desc{margin:6px 0 0;font-size:14px;color:#64748b;line-height:1.55}
      .scenario-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:12px;font-weight:900;white-space:nowrap}
      .scenario-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .scenario-item{border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;padding:12px}
      .scenario-label{font-size:11px;font-weight:900;color:#64748b;margin-bottom:4px}
      .scenario-value{font-size:14px;font-weight:900;color:#111827;line-height:1.45}
      .scenario-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
      .scenario-actions a,.scenario-actions button{display:inline-flex;align-items:center;justify-content:center;border-radius:10px;text-decoration:none;position:relative;z-index:1}
      .scenario-flow{display:flex;gap:8px;overflow:auto;padding:4px 0 2px;margin-top:12px}
      .scenario-flow span{flex:0 0 auto;border:1px solid #e2e8f0;background:#f8fafc;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800;color:#64748b}
      .scenario-flow span.active{background:#ffd100;border-color:#ffd100;color:#111827}
      .scenario-note{border-left:4px solid #ffd100;background:#fff8d6;border-radius:10px;padding:12px 14px;color:#334155;font-size:13px;line-height:1.6}
      @media (max-width:900px){.scenario-head{display:block}.scenario-chip{margin-top:12px}.scenario-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media (max-width:560px){.scenario-grid{grid-template-columns:1fr}.scenario-title{font-size:18px}}
    `;
    document.head.appendChild(style);
  }

  function replaceTextNodes(replacements) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let text = node.nodeValue;
      replacements.forEach(([from, to]) => {
        text = text.split(from).join(to);
      });
      node.nodeValue = text;
    });
  }

  function replaceAttributes(replacements) {
    const attrs = ['aria-label', 'title', 'placeholder', 'value'];
    document.querySelectorAll('*').forEach((el) => {
      attrs.forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const original = el.getAttribute(attr);
        let next = original;
        replacements.forEach(([from, to]) => {
          next = next.split(from).join(to);
        });
        if (next !== original) el.setAttribute(attr, next);
      });
    });
  }

  function applyScenarioTextReplacements() {
    const replacements = [
      ['CNC 머시닝센터 #1', '스마트정밀'],
      ['CNC 선반 #2', '장밀테크 주식회사'],
      ['레이저 절단기 #1', '에이원 가공'],
      ['한빛정밀 주식회사', '스마트정밀'],
      ['(주)한빛정밀', '스마트정밀'],
      ['(주)서진정밀', '스마트정밀'],
      ['서진정밀', '스마트정밀'],
      ['김한빛', '박정우'],
      ['김수현 과장', '박정우 담당자'],
      ['브라켓 하우징', 'Bracket Assembly'],
      ['CNC 가공 부품', 'Bracket Assembly'],
      ['Bracket_Housing.dwg', 'Bracket_Assembly.dwg'],
      ['Bracket_001', 'Bracket_Assembly'],
      ['ORD-250520-001', 'PO-2025-00123'],
      ['ORD-250620-014', 'PO-2025-00123'],
      ['RFQ-250520-001', 'RFQ-20260508-001'],
      ['RFQ-250620-014', 'RFQ-20260508-001'],
      ['128,450,000원', '6,250,000원'],
      ['128,450,000', '6,250,000'],
      ['18,450,000원', '6,250,000원'],
      ['18,450,000', '6,250,000'],
      ['2026-07-05', '2026-06-15'],
      ['2026-07-03', '2026-06-15'],
      ['2026-06-27', '2026-06-15'],
      ['2026-05-27', '2026-06-15'],
      ['화물차 탁송', '무진동 차량'],
      ['알루미늄 6061-T6', 'AL6061'],
      ['CNC 밀링', 'CNC 가공'],
      ['홍길동', '이도현'],
      ['김민준', '도현로보틱스'],
      ['클라이언트 리뷰', '받은 리뷰'],
      ['클라이언트 평점 등록', '받은 리뷰 확인'],
      ['업체 배칭', '업체 매칭'],
      ['배칭', '매칭'],
      ['Bracket Assembly (Bracket Assembly)', 'Bracket Assembly']
    ];
    replaceTextNodes(replacements);
    replaceAttributes(replacements);
  }

  function applyScenarioHeader() {
    const clientPages = new Set(['/client', '/quote-request', '/matching-ui', '/order-management', '/client-fulfillment']);
    const actions = document.querySelector('.header-actions');
    if (clientPages.has(page) && actions) {
      actions.innerHTML = `
        <span style="font-weight:900;color:#111827;">이도현 님</span>
        <a class="btn-login" href="/#home">로그아웃</a>
      `;
    }
  }

  function scenarioMount() {
    return document.querySelector('.page-title, .mw-top, .dash-header, .admin-hero, .main-header, .page-wrap, .mw-app-content') || document.querySelector('main');
  }

  function insertScenarioPanel(html, mode = 'after') {
    if (document.querySelector('.scenario-panel')) return;
    const mount = scenarioMount();
    if (!mount) return;
    if (mount.classList.contains('page-wrap') && mode !== 'before') {
      mount.insertAdjacentHTML('afterbegin', html);
      return;
    }
    mount.insertAdjacentHTML(mode === 'before' ? 'beforebegin' : 'afterend', html);
  }

  function scenarioPanel({ kicker, title, desc, chip, items, active, links, note }) {
    const itemHtml = (items || []).map((item) => `
      <div class="scenario-item">
        <div class="scenario-label">${item[0]}</div>
        <div class="scenario-value">${item[1]}</div>
      </div>
    `).join('');
    const flow = ['가입', '견적 등록', 'AI 보완', '업체 비교', '발주·계약', '생산', '납품 인증', '리뷰·완료']
      .map((label) => `<span class="${label === active ? 'active' : ''}">${label}</span>`).join('');
    const linkHtml = (links || []).map((link) => {
      if (link.type === 'button') return `<button type="button" class="${link.className || 'btn-primary'}">${link.label}</button>`;
      return `<a href="${link.href}" class="${link.className || 'btn-primary'}">${link.label}</a>`;
    }).join('');
    return `
      <section class="scenario-panel">
        <div class="scenario-head">
          <div>
            <div class="scenario-kicker">${kicker}</div>
            <h2 class="scenario-title">${title}</h2>
            <p class="scenario-desc">${desc}</p>
          </div>
          <span class="scenario-chip"><i class="ri-route-line"></i>${chip}</span>
        </div>
        <div class="scenario-grid">${itemHtml}</div>
        <div class="scenario-flow">${flow}</div>
        ${note ? `<div class="scenario-note" style="margin-top:14px;">${note}</div>` : ''}
        ${linkHtml ? `<div class="scenario-actions">${linkHtml}</div>` : ''}
      </section>
    `;
  }

  function appendScenarioDemoFacts() {
    const extraFacts = {
      '/client-fulfillment': [
        ['클라이언트', '도현로보틱스 / 이도현'],
        ['요청명', 'Bracket Assembly · AL6061 · 100 EA']
      ],
      '/matching-ui': [
        ['클라이언트', '도현로보틱스 / 이도현']
      ],
      '/order-management': [
        ['클라이언트', '도현로보틱스 / 이도현'],
        ['재질/수량', 'AL6061 / 100 EA']
      ],
      '/supplier-workbench': [
        ['요청명', 'Bracket Assembly 제작 요청']
      ],
      '/admin-control-center': [
        ['제품명', 'Bracket Assembly · AL6061 · 100 EA']
      ]
    };
    const facts = extraFacts[page];
    const grid = document.querySelector('.scenario-panel .scenario-grid');
    if (!facts || !grid || grid.dataset.scenarioExtraFacts === 'true') return;

    grid.insertAdjacentHTML('beforeend', facts.map((item) => `
      <div class="scenario-item">
        <div class="scenario-label">${item[0]}</div>
        <div class="scenario-value">${item[1]}</div>
      </div>
    `).join(''));
    grid.dataset.scenarioExtraFacts = 'true';
  }

  function applyClientRegisterScenario() {
    const inputs = document.querySelectorAll('input');
    const values = ['이도현', '010-1234-5678', 'dohyun@robotics.co.kr', 'dohyun_buyer', '', '', '도현로보틱스'];
    inputs.forEach((input, index) => {
      if (values[index] !== undefined && values[index]) input.placeholder = values[index];
    });
  }

  function applyClientDashboardScenario() {
    insertScenarioPanel(scenarioPanel({
      kicker: 'Client demo',
      title: '이도현님, 환영합니다.',
      desc: '도면을 업로드하고 견적 요청을 등록할 수 있습니다. 이번 시연은 Bracket Assembly 제작 요청을 기준으로 진행됩니다.',
      chip: '1단계 준비',
      active: '견적 등록',
      items: [
        ['클라이언트', '도현로보틱스 / 이도현'],
        ['진행 요청', 'Bracket Assembly 제작 요청'],
        ['다음 행동', '견적 요청 등록'],
        ['데모 창', '클라이언트 창']
      ],
      links: [{ href: '/quote-request', label: '견적 요청 등록으로 이동' }]
    }));

    // 신규 가입 직후 시점에 맞게 통계 카드(4개)를 0으로 정렬
    const statValues = document.querySelectorAll('.stat-card .stat-value');
    const subStyle = 'font-size:14px;font-weight:600;color:var(--text-muted);';
    if (statValues[0]) statValues[0].innerHTML = `0<span style="${subStyle}">건</span>`;
    if (statValues[1]) statValues[1].innerHTML = `0<span style="${subStyle}">건</span>`;
    if (statValues[2]) statValues[2].innerHTML = `0<span style="${subStyle}">건</span>`;
    if (statValues[3]) statValues[3].innerHTML = `0<span style="${subStyle}">원</span>`;

    // 최근 진행 현황 카드: 가입 직후라 진행 거래가 없으므로 placeholder로 교체
    const recentTitle = Array.from(document.querySelectorAll('.card-title'))
      .find((titleEl) => textOf(titleEl).includes('최근 진행 현황'));
    const recentCard = recentTitle?.closest('.card');
    if (recentCard) {
      const orderList = recentCard.querySelector('.order-list');
      if (orderList) {
        orderList.innerHTML = `
          <div style="text-align:center;padding:36px 20px;color:var(--text-muted);font-size:13px;">
            <i class="ri-inbox-line" style="font-size:32px;display:block;margin-bottom:8px;color:var(--primary);"></i>
            아직 등록된 견적 요청이 없습니다.<br>
            <strong style="color:#111;">새 견적 요청</strong> 버튼을 눌러 도면을 업로드하고 시작하세요.
          </div>
        `;
      }
    }
  }

  function applyQuoteScenario() {
    const title = document.querySelector('.page-title h1');
    const desc = document.querySelector('.page-title p');
    if (title) title.textContent = '견적 요청 등록';
    if (desc) desc.textContent = '최종 주문이 아니라 AI 분석 전 기본 요청 정보를 등록하는 단계입니다.';

    const fileName = document.getElementById('file-name-display');
    if (fileName) fileName.textContent = 'Bracket_Assembly.dwg';
    const summaryFile = document.getElementById('s-file');
    if (summaryFile) summaryFile.textContent = '1개';

    const summaryUpdates = {
      's-qty': '100개',
      's-mat': 'AL6061',
      's-proc': 'CNC 가공',
      's-date': '2026-06-15',
      's-budget': '500만 ~ 800만원'
    };
    Object.entries(summaryUpdates).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    });

    const selects = document.querySelectorAll('select');
    if (selects[0]) {
      const option = document.createElement('option');
      option.textContent = '모름 / AI가 도면에서 추정';
      option.value = '모름 / AI가 도면에서 추정';
      selects[0].appendChild(option);
      selects[0].value = 'AL6061';
    }
    if (selects[1]) selects[1].value = 'CNC 가공';
    if (selects[4]) selects[4].value = '500만원 이상';

    const qty = document.querySelector('input[type=number]');
    if (qty) qty.value = '100';
    const date = document.querySelector('input[type=date]');
    if (date) date.value = '2026-06-15';
    const submit = document.querySelector('.submit-area .btn-primary');
    if (submit) {
      submit.textContent = 'AI 분석 시작하기';
      submit.setAttribute('href', '/client-fulfillment#ai');
    }

    const basicCard = Array.from(document.querySelectorAll('.card')).find((card) => textOf(card).includes('기본 요청 정보'));
    if (basicCard && !basicCard.querySelector('.scenario-extra-fields')) {
      basicCard.insertAdjacentHTML('beforeend', `
        <div class="scenario-extra-fields" style="margin-top:18px;">
          <div class="form-grid" style="margin-bottom:16px;">
            <div class="form-group"><label>프로젝트명</label><input value="Bracket Assembly 제작 요청"></div>
            <div class="form-group"><label>수령 방식</label><input value="무진동 차량"></div>
            <div class="form-group"><label>위치</label><input value="경기도 화성시"></div>
          </div>
          <div class="form-grid form-grid-2">
            <div class="form-group"><label>제품 용도</label><input value="산업 장비 부품"></div>
            <div class="form-group"><label>양산/재발주 계획</label><input value="양산 계획 있음 · 연 500EA 예상"></div>
          </div>
        </div>
      `);
    }

    insertScenarioPanel(scenarioPanel({
      kicker: 'Step 1',
      title: '견적 요청 등록 단계',
      desc: '업체, 가격, 계약은 아직 확정되지 않았습니다. 도면과 기본 조건만 등록한 뒤 AI 분석으로 넘어갑니다.',
      chip: 'AI 분석 전',
      active: '견적 등록',
      items: [
        ['도면 파일', 'Bracket_Assembly.dwg'],
        ['재질 / 수량', 'AL6061 / 100 EA'],
        ['납기 / 수령', '2026-06-15 / 무진동 차량'],
        ['예산', '500만 ~ 800만원']
      ]
    }));
  }

  function applyClientFulfillmentScenario() {
    const title = document.querySelector('.mw-title h1');
    const desc = document.querySelector('.mw-title p');
    if (title) title.textContent = '견적·발주 진행 관리';
    if (desc) desc.textContent = 'AI 분석 보완, 생산 진행도 확인, 납품 인증, 업체 리뷰까지 한 흐름으로 확인합니다.';

    // 5번(#ai)과 18번(no hash)에서 같은 페이지를 사용하므로, 시점에 맞지 않는 카드를 hidden 처리한다.
    const aiPhase = location.hash === '#ai';
    const cards = document.querySelectorAll('main.mw-page > .mw-main-grid .mw-card');
    cards.forEach((card) => {
      const titleNode = card.querySelector('.mw-card-title');
      const cardTitle = titleNode ? titleNode.textContent.trim() : '';
      // AI 추가 정보 요청 카드는 5번에서, 그 외 본문 카드는 18번에서만 보인다.
      // 사이드바의 작은 카드(선택 업체/결제·정산/진행 이벤트)는 18번 후반 정보이므로 5번에선 hidden.
      const isAiCard = cardTitle.includes('AI 추가 정보 요청');
      if (aiPhase) {
        card.hidden = !isAiCard;
      } else {
        // step 18 시점: AI 추가 정보 요청 카드는 5번 단계용이라 숨김.
        // 그 외 본문 카드(납품 인증 체크, 품질 문서, 업체 리뷰 등)만 노출.
        card.hidden = isAiCard;
      }
    });
    // 상단 단계 진행도(mw-steps): 5번엔 02 AI 보완 active, 18번엔 05 납품·검수 active
    document.querySelectorAll('.mw-steps .mw-step').forEach((step, idx) => {
      step.classList.remove('active');
      step.classList.remove('done');
      if (aiPhase) {
        if (idx === 0) step.classList.add('done');
        else if (idx === 1) step.classList.add('active');
      } else {
        if (idx <= 3) step.classList.add('done');
        else if (idx === 4) step.classList.add('active');
      }
    });
    // 4개 KPI 카드: 5번 시점엔 후반 정보(출하 완료/잔금 대기/미작성)가 어색하므로 hidden
    const kpiSection = document.querySelector('.mw-kpis');
    if (kpiSection) kpiSection.hidden = aiPhase;

    // 상단 페이지 액션(진행 상세, 납품 인증 체크): 18번에서 사용하는 후반부 버튼이라 5단계에서는 숨김
    const topActions = document.querySelector('.mw-top .mw-actions');
    if (topActions) topActions.hidden = aiPhase;

    insertScenarioPanel(scenarioPanel({
      kicker: 'Client progress',
      title: aiPhase ? 'AI 분석 결과 및 누락 정보 보완' : '생산·납품·리뷰 진행 화면',
      desc: aiPhase
        ? 'AI 분석 결과와 누락 정보를 보완한 뒤 RFQ를 확정합니다.'
        : '도면 분석 결과와 누락 정보를 보완한 뒤 RFQ를 확정하고, 이후 같은 화면에서 생산 진행도와 납품 인증을 확인합니다.',
      chip: aiPhase ? '2단계 AI 보완' : '후반 진행',
      active: aiPhase ? 'AI 보완' : '납품 인증',
      items: aiPhase ? [
        ['AI 분석', 'AL6061 표기 확인 · 브라켓 구조 감지'],
        ['누락 정보', '구멍 Ø12mm · 아노다이징 흑색 · 조립 범위'],
        ['RFQ 상태', 'open · 매칭 대기'],
        ['다음 단계', 'RFQ 확정 후 업체 매칭']
      ] : [
        ['AI 분석', 'AL6061 표기 확인 · 브라켓 구조 감지'],
        ['누락 정보', '구멍 Ø12mm · 아노다이징 흑색 · 조립 범위'],
        ['RFQ 상태', 'open · 업체 매칭 가능'],
        ['현재 거래', 'PO-2025-00123 · 포장 완료']
      ],
      note: aiPhase
        ? 'AI가 표시한 누락 항목을 보완하면 RFQ가 확정되고, 다음 단계에서 업체 매칭이 진행됩니다.'
        : '리뷰 단계는 클라이언트가 완료 거래에 대해 스마트정밀을 평가하고, 업체 화면에서는 받은 리뷰를 확인하는 흐름으로 정리했습니다.',
      links: aiPhase ? [
        { href: '/matching-ui', label: 'RFQ 확정 후 업체 매칭 실행' }
      ] : [
        { href: '/order-management', label: '진행 현황 자세히 보기', className: 'btn-outline' }
      ]
    }));
  }

  function applyMatchingScenario() {
    insertScenarioPanel(scenarioPanel({
      kicker: 'Step 3',
      title: '업체 비교 및 스마트정밀 선택',
      desc: 'AI 매칭 결과에서 납기, 평점, 품질 인증 대응 가능 여부를 비교하고 스마트정밀을 선택합니다.',
      chip: '업체 선택',
      active: '업체 비교',
      items: [
        ['1순위', '스마트정밀 · 4.8 · 7일'],
        ['견적 금액', '6,250,000원 · 예산 범위 내'],
        ['가능 공정', 'CNC 가공 · 아노다이징 · 조립'],
        ['다음 상태', '발주 및 계약 진행']
      ],
      links: [{ href: '#recommended-quotes', label: '추천 업체 비교표 보기' }]
    }));

    const rowNames = document.querySelectorAll('.supplier-row .s-info h4');
    if (rowNames[0]) rowNames[0].innerHTML = '스마트정밀 <span class="ai-badge">AI 92%</span>';
    if (rowNames[1]) rowNames[1].innerHTML = '장밀테크 주식회사 <span class="ai-badge" style="background:#E2E8F0;color:#555;">AI 85%</span>';
    if (rowNames[2]) rowNames[2].innerHTML = '에이원 가공 <span class="ai-badge" style="background:#E2E8F0;color:#555;">AI 78%</span>';
    const amounts = document.querySelectorAll('.s-price .amount');
    if (amounts[0]) amounts[0].textContent = '6,250,000원';
    if (amounts[1]) amounts[1].textContent = '6,800,000원';
    if (amounts[2]) amounts[2].textContent = '5,900,000원';
    const days = document.querySelectorAll('.s-days .num');
    if (days[0]) days[0].textContent = '7';
    if (days[1]) days[1].textContent = '8';
    if (days[2]) days[2].textContent = '9';
  }

  function setScenarioItemValue(panel, label, value) {
    if (!panel) return;
    panel.querySelectorAll('.scenario-item').forEach((item) => {
      const itemLabel = item.querySelector('.scenario-label');
      const itemValue = item.querySelector('.scenario-value');
      if (itemLabel && itemValue && textOf(itemLabel) === label) itemValue.innerHTML = value;
    });
  }

  function syncOrderProductionState() {
    if (page !== '/order-management') return;
    const shared = productionShared();
    const paid = clientPaid();
    const panel = document.querySelector('.scenario-panel');

    if (panel) {
      const title = panel.querySelector('.scenario-title');
      const desc = panel.querySelector('.scenario-desc');
      const chip = panel.querySelector('.scenario-chip');
      const note = panel.querySelector('.scenario-note');

      if (title) {
        title.textContent = shared
          ? '선입금 완료 및 생산 진행 확인'
          : paid
            ? '선입금 완료, 생산 공유 대기'
            : '발주·계약 확인 및 결제 대기';
      }
      if (desc) {
        desc.textContent = shared
          ? '스마트정밀이 공유한 생산 이벤트가 클라이언트 화면에 반영된 상태입니다.'
          : paid
            ? '계약·보안·결제대행 입금이 완료되었고, 아직 업체가 생산 진행도를 공유하기 전입니다.'
            : '계약·보안 조건을 확인한 뒤 결제하기를 눌러 결제대행 선입금을 완료합니다.';
      }
      if (chip) chip.innerHTML = `<i class="ri-route-line"></i>${shared ? '상태 production' : paid ? '상태 paid' : '상태 payment pending'}`;
      if (note) {
        note.textContent = shared
          ? '업체가 생산 진행도 공유 버튼을 눌러 클라이언트가 생산중 65%와 최근 업데이트를 확인할 수 있습니다.'
          : paid
            ? '14번에서 가공업체가 생산 진행도 공유를 누른 뒤 이 화면으로 돌아오면 생산중 65% 상태를 확인합니다. 이미 열려 있던 탭이면 생산 공유 상태 새로고침을 누릅니다.'
            : '먼저 결제하기를 눌러 결제 완료 화면을 확인하고, 발주 진행 화면으로 돌아온 뒤 다음 단계로 넘어갑니다.';
      }

      panel.querySelectorAll('.scenario-flow span').forEach((step) => {
        step.classList.toggle('active', textOf(step) === (shared ? '생산' : '발주·계약'));
      });
      setScenarioItemValue(panel, '생산 진행', shared ? '생산중 · 진행률 65%' : paid ? '업체 공유 대기' : '결제 완료 후 생산 대기');
      setScenarioItemValue(panel, '최근 업데이트', shared ? '후처리 진행 · 납기 정상' : paid ? '최종 발주 수락 완료 · 생산 이벤트 대기' : '계약/NDA 적용 · 결제 전');
      setScenarioItemValue(panel, '결제 상태', paid ? '결제대행 입금 완료' : '결제대행 입금 대기');
    }

    const activeStep = document.querySelector('.pt-step.active');
    const activeLabel = activeStep?.querySelector('.pt-label');
    const activeDate = activeStep?.querySelector('.pt-date');
    if (activeLabel) activeLabel.textContent = shared ? '생산중' : paid ? '생산 공유 대기' : '결제 대기';
    if (activeDate) activeDate.textContent = shared ? '진행률 65%' : paid ? '업체 업데이트 대기' : '선입금 필요';

    // 상단 order-meta의 결제 상태 배지·페이지 바: 결제 전·후 모두 시연 시나리오(결제대행 단일 입금)에 정렬
    const payStatusBadge = document.querySelector('.payment-status .badge');
    if (payStatusBadge) {
      payStatusBadge.textContent = paid ? '결제대행 입금 완료' : '결제대행 입금 대기';
      payStatusBadge.className = paid ? 'badge badge-green' : 'badge badge-yellow';
    }
    const payPctText = document.querySelector('.payment-status .pay-pct');
    if (payPctText) payPctText.textContent = paid ? '결제대행 입금 완료' : '결제대행 입금 대기';
    const payBarFill = document.querySelector('.payment-status .pay-bar-fill');
    if (payBarFill) payBarFill.style.width = paid ? '100%' : '0%';

    // 진행 사진 카드: 결제·공유 전엔 hidden, 공유 후엔 시연용4 14번 시점(후처리·가공·원자재 입고) 캡션으로 갱신
    const photoCardTitle = Array.from(document.querySelectorAll('.card-title'))
      .find((titleEl) => textOf(titleEl).includes('진행 사진'));
    const photoCard = photoCardTitle?.closest('.card');
    if (photoCard) {
      photoCard.hidden = !shared;
      if (shared) {
        const photoDates = photoCard.querySelectorAll('.photo-date');
        if (photoDates[0]) photoDates[0].textContent = '2026-06-21';
        if (photoDates[1]) photoDates[1].textContent = '2026-06-21';
        if (photoDates[2]) photoDates[2].textContent = '2026-06-18';
        const captionRow = photoCard.querySelector('.photo-grid + div');
        if (captionRow) {
          captionRow.innerHTML = '<span>후처리 진행 중</span>'
            + '<span style="margin:0 4px;">·</span>'
            + '<span>1차 가공 완료</span>'
            + '<span style="margin:0 4px;">·</span>'
            + '<span>AL6061 원자재 입고</span>';
        }
      }
    }

    // process-timeline 단계별 done/active 상태를 결제·생산 공유 상태에 맞게 다시 그린다.
    // HTML에는 결제 단계가 항상 done으로 박혀 있어, 결제 전에도 결제 완료처럼 보이는 문제를 보정.
    const ptSteps = Array.from(document.querySelectorAll('.process-timeline .pt-step'));
    const ptLines = Array.from(document.querySelectorAll('.process-timeline .pt-line'));
    if (ptSteps.length >= 3) {
      // 단계 인덱스: 0=계약, 1=결제, 2=생산중, 3=검수, 4=출하, 5=납품완료
      const stageStates = [
        { done: true,  active: false }, // 계약은 늘 완료 (이미 발주 확정)
        { done: paid,  active: !paid },  // 결제: 결제 전엔 active, 결제 후 done
        { done: false, active: paid },   // 생산: 결제 후에만 active (공유 전후 모두 active 유지, 색만 다름)
        { done: false, active: false },
        { done: false, active: false },
        { done: false, active: false }
      ];
      ptSteps.forEach((step, idx) => {
        const state = stageStates[idx];
        if (!state) return;
        step.classList.toggle('done', state.done);
        step.classList.toggle('active', state.active);
      });
      ptLines.forEach((line, idx) => {
        // 라인 idx는 단계 idx 사이를 잇는다: 0(계약→결제), 1(결제→생산), ...
        // 결제 후엔 0,1번 라인이 done. 결제 전엔 0번만 done.
        const shouldBeDone = paid ? idx <= 1 : idx === 0;
        line.classList.toggle('done', shouldBeDone);
      });
      // 생산중 단계의 라벨/일자를 상태에 맞게 갱신 (결제 전엔 빈 상태로)
      const productionStep = ptSteps[2];
      if (productionStep) {
        const pLabel = productionStep.querySelector('.pt-label');
        const pDate = productionStep.querySelector('.pt-date');
        if (pLabel) pLabel.textContent = shared ? '생산중' : paid ? '생산 공유 대기' : '생산';
        if (pDate) pDate.textContent = shared ? '진행률 65%' : paid ? '업체 업데이트 대기' : '결제 후 시작';
      }
      // 결제 단계의 라벨/일자를 상태에 맞게 갱신
      const paymentStep = ptSteps[1];
      if (paymentStep) {
        const payLabel = paymentStep.querySelector('.pt-label');
        const payDate = paymentStep.querySelector('.pt-date');
        if (payLabel) payLabel.textContent = '결제';
        if (payDate) payDate.textContent = paid ? '결제대행 입금 완료' : '결제대행 입금 대기';
      }
    }

    const progressTitle = Array.from(document.querySelectorAll('.card-title'))
      .find((title) => textOf(title).includes('진행 현황'));
    const progressCard = progressTitle?.closest('.card');
    if (progressCard) {
      progressCard.id = 'progress';
      progressTitle.innerHTML = shared
        ? '진행 현황 <span style="color:var(--primary-dark);font-weight:700;">생산중</span> · 진행률 65%'
        : paid
          ? '진행 현황 <span style="color:var(--primary-dark);font-weight:700;">업체 공유 대기</span>'
          : '진행 현황 <span style="color:var(--primary-dark);font-weight:700;">결제 대기</span>';
      const fill = progressCard.querySelector('.pay-bar-fill');
      if (fill) {
        fill.style.width = shared ? '65%' : '0%';
        fill.style.background = shared ? '#111' : 'var(--border)';
      }
      const updateList = progressCard.querySelector('.update-list');
      if (updateList) {
        updateList.innerHTML = shared ? `
          <div class="update-item">
            <div class="update-time">2026-06-21 18:30</div>
            <div><span class="update-tag">생산</span> 1차 가공 완료 후 후처리 진행 중 <span class="new-badge">NEW</span></div>
          </div>
          <div class="update-item">
            <div class="update-time">2026-06-18 09:10</div>
            <div><span class="update-tag blue">자재</span> AL6061 원자재 입고 완료</div>
          </div>
          <div class="update-item">
            <div class="update-time">2026-06-15 16:20</div>
            <div><span class="update-tag green">계약</span> 계약서 및 NDA 확인 완료</div>
          </div>
        ` : `
          <div class="update-item">
            <div class="update-time">${paid ? '대기 중' : '결제 전'}</div>
            <div><span class="update-tag green">${paid ? '결제' : '계약'}</span> ${paid ? '계약/NDA/결제대행 완료. 업체 생산 진행도 공유 대기' : '계약/NDA 적용 완료. 결제하기를 눌러 선입금을 완료해야 합니다.'}</div>
          </div>
        `;
      }
    }
  }

  function initOrderProductionSync() {
    if (page !== '/order-management') return;
    window.addEventListener('storage', (event) => {
      if (event.key === 'immaDemoProductionShared' || event.key === 'immaDemoClientPaid') syncOrderProductionState();
    });
    window.addEventListener('focus', syncOrderProductionState);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) syncOrderProductionState();
    });
  }

  function applyOrderScenario() {
    const paid = clientPaid();
    insertScenarioPanel(scenarioPanel({
      kicker: 'Step 4',
      title: paid ? '선입금 완료 및 생산 진행 확인' : '발주·계약 확인 및 결제 대기',
      desc: paid
        ? '스마트정밀 발주 건의 결제대행 입금이 완료되었습니다. 이후 업체가 공유한 생산 진행도를 같은 화면에서 확인합니다.'
        : '스마트정밀 견적을 선택해 발주를 확정했습니다. 계약·보안 조건을 확인하고 결제하기를 눌러 선입금을 완료합니다.',
      chip: paid ? '상태 paid' : '상태 payment pending',
      active: '발주·계약',
      items: [
        ['발주 번호', 'PO-2025-00123'],
        ['선택 업체', '스마트정밀 · 평점 4.8'],
        ['총 금액', '6,250,000원 · 부가세 포함'],
        ['계약/보안', 'SGI 계약 지원 · NDA 동의'],
        ['결제 상태', paid ? '결제대행 입금 완료' : '결제대행 입금 대기'],
        ['생산 진행', paid ? '업체 공유 대기' : '결제 완료 후 생산 대기'],
        ['최근 업데이트', paid ? '최종 발주 수락 완료 · 생산 이벤트 대기' : '계약/NDA 적용 · 결제 전']
      ],
      note: paid
        ? '14번에서 가공업체가 생산 진행도 공유를 누른 뒤 이 화면으로 돌아오면 생산중 65% 상태를 확인합니다. 이미 열려 있던 탭이면 생산 공유 상태 새로고침을 누릅니다.'
        : '결제하기를 누르면 결제 완료 화면으로 이동합니다. 그 화면에서 발주 진행 화면으로 돌아가기를 눌러 이 발주 화면으로 돌아오면 결제 완료 상태가 됩니다.',
      links: paid
        ? [
          { type: 'button', label: '생산 공유 상태 새로고침', className: 'btn-outline' },
          { href: '#progress', label: '진행 현황 자세히 보기', className: 'btn-outline' }
        ]
        : [
          { type: 'button', label: '결제하기' }
        ]
    }));

    const progressTitle = Array.from(document.querySelectorAll('.card-title'))
      .find((title) => textOf(title).includes('진행 현황'));
    const progressCard = progressTitle?.closest('.card');
    if (progressCard) progressCard.id = 'progress';
    syncOrderProductionState();
  }

  function applySupplierDashboardScenario() {
    insertScenarioPanel(scenarioPanel({
      kicker: 'Supplier demo',
      title: '스마트정밀 수신 요청 확인',
      desc: '도현로보틱스의 Bracket Assembly 제작 요청이 신규 견적 요청으로 들어온 상태입니다.',
      chip: '수신 요청',
      active: '발주·계약',
      items: [
        ['요청명', 'Bracket Assembly 제작 요청'],
        ['재질 / 수량', 'AL6061 / 100 EA'],
        ['희망 납기', '2026-06-15'],
        ['다음 작업', '오더리스트 확인 후 첫 번째 요청 수락']
      ],
      links: [{ href: '/supplier-workbench#rfq', label: '오더리스트 화면으로 이동' }]
    }));
  }

  function applySupplierDetailScenario() {
    insertScenarioPanel(scenarioPanel({
      kicker: 'RFQ detail',
      title: 'Bracket Assembly 요청 상세',
      desc: '상세 화면에서는 요청 조건만 검토합니다. 견적 금액과 납기 입력은 작업정보 회신 화면에서 진행합니다.',
      chip: '상세 검토',
      active: '발주·계약',
      items: [
        ['클라이언트', '도현로보틱스 / 이도현'],
        ['도면', 'Bracket_Assembly.dwg'],
        ['공정', 'CNC 가공 · 구멍 가공 · 아노다이징 · 조립'],
        ['수령', '무진동 차량 · 경기도 화성시']
      ],
      links: [{ href: '/supplier-workbench#reply', label: '견적 제출로 이동' }]
    }));
  }

  function applySupplierWorkbenchScenario() {
    insertScenarioPanel(scenarioPanel({
      kicker: 'Supplier workbench',
      title: '가공업체 작업·납품 워크벤치',
      desc: '스마트정밀은 신규 RFQ 수신부터 견적 회신, 발주 수락, 생산 진행도 공유, 납품 정보 등록까지 단계별로 처리합니다. 상단 KPI는 운영 환경의 누적 통계이며, 이번 시연 거래는 그 중 1건입니다.',
      chip: 'RFQ 수신',
      active: '발주·계약',
      items: [
        ['수신 요청', 'RFQ-20260508-001 · Bracket Assembly'],
        ['클라이언트', '도현로보틱스 · AL6061 / 100 EA'],
        ['희망 납기', '2026-06-15'],
        ['가공업체 역할', '수락 → 견적 회신 → 발주 수락 → 생산 → 납품']
      ],
      note: '왼쪽 메뉴 또는 아래 단축 링크로 오더리스트, 작업정보 회신, 발주 수락, 생산 진행도, 납품 정보, 받은 리뷰를 차례로 확인합니다.',
      links: [
        { href: '/supplier-workbench#rfq', label: '오더리스트' },
        { href: '/supplier-workbench#reply', label: '작업정보 회신', className: 'btn-outline' },
        { href: '/supplier-workbench#orders', label: '발주 수락', className: 'btn-outline' },
        { href: '/supplier-workbench#delivery', label: '납품 정보 등록', className: 'btn-outline' }
      ]
    }));

    applySupplierOrdersScenario();
    applySupplierReviewsCardOnDemand();

    const reviewButton = Array.from(document.querySelectorAll('button')).find((button) => textOf(button).includes('받은 리뷰 확인'));
    if (reviewButton) reviewButton.remove();

    // 시연 흐름 중 상태 변화에 따라 본문 카드 동적 갱신.
    // - storage: 클라이언트가 다른 창에서 결제대행 입금 완료(step 11) 또는 생산 공유(step 14) 신호를 보냄
    // - hashchange: 시연자가 사이드바 메뉴 클릭 또는 자동 스크롤로 #orders/#production/#reviews로 이동
    // - visibilitychange: 가공업체 창을 다시 활성화할 때(step 13에서 alt+tab 등) 안전망으로 재확인
    const refreshSupplierWorkbenchCards = () => {
      if (clientPaid()) applySupplierOrdersScenario();
      applySupplierReviewsCardOnDemand();
    };
    window.addEventListener('storage', (e) => {
      if (!e || !e.key) return;
      if (e.key === 'immaDemoClientPaid' || e.key === 'immaDemoProductionShared') {
        refreshSupplierWorkbenchCards();
      }
    });
    window.addEventListener('hashchange', refreshSupplierWorkbenchCards);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshSupplierWorkbenchCards();
    });
  }

  function applySupplierReviewsCardOnDemand() {
    // 받은 리뷰 카드는 시연 step 19(#reviews)에서만 의미가 있음 (그 이전엔 미래 상태)
    if (location.hash !== '#reviews') return;
    const reviewCard = document.getElementById('reviews');
    if (!reviewCard) return;
    if (reviewCard.dataset.scenarioApplied === 'true') return;
    reviewCard.dataset.scenarioApplied = 'true';

    reviewCard.innerHTML = `
      <div class="mw-card-head">
        <div>
          <div class="mw-card-title"><i class="ri-user-star-line"></i> 받은 리뷰 확인</div>
          <div class="mw-card-sub">거래 완료 후 클라이언트가 남긴 평점과 리뷰를 확인하고 업체 거래 이력에 반영합니다.</div>
        </div>
        <span class="mw-badge green">리뷰 반영 완료</span>
      </div>
      <div class="mw-list">
        <div class="mw-list-item soft">
          <div>
            <div class="mw-list-title">도현로보틱스 · 5.0</div>
            <div class="mw-list-meta">Bracket Assembly 품질/포장/진행 공유 만족 · 재발주 의향 있음</div>
          </div>
          <span class="mw-badge green">확인 완료</span>
        </div>
      </div>
    `;
  }

  function applySupplierOrdersScenario() {
    const orders = document.getElementById('orders');
    if (!orders) return;

    const production = orders.nextElementSibling;
    if (production && !production.id) production.id = 'production';

    // 발주 수락·생산 진행도 카드 처리는 클라이언트가 결제대행 입금 완료(step 11) 이후에만 적용.
    // 그 이전(step 8/9 시점)에는 미래 상태(노란 안내바·"최종 발주 수락" 버튼·체크박스 모두 확정)가 보이지 않도록 미처리.
    if (!clientPaid()) return;

    // 중복 처리 방지: 이미 한 번 적용되었으면 재실행하지 않음.
    if (orders.dataset.scenarioApplied === 'true') return;
    orders.dataset.scenarioApplied = 'true';

    const title = orders.querySelector('.mw-card-title');
    const sub = orders.querySelector('.mw-card-sub');
    const badge = orders.querySelector('.mw-card-head .mw-badge');
    if (title) title.innerHTML = '<i class="ri-shake-hands-line"></i> 발주 수락·계약·기밀유지';
    if (sub) sub.textContent = '클라이언트가 발주를 확정한 뒤 업체가 최종 수락하고 생산 일정을 확정합니다.';
    if (badge) {
      badge.textContent = '최종 수락 대기';
      badge.className = 'mw-badge green';
    }

    if (!orders.querySelector('.scenario-order-accept-bar')) {
      const head = orders.querySelector('.mw-card-head');
      head?.insertAdjacentHTML('afterend', `
        <div class="scenario-order-accept-bar" style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;margin:0 0 16px;border:1px solid #fde68a;background:#fffbeb;border-radius:12px;">
          <div>
            <div style="font-size:13px;font-weight:900;color:#92400e;">PO-2025-00123 · 도현로보틱스 · Bracket Assembly</div>
            <div style="font-size:13px;color:#64748b;margin-top:4px;">계약/NDA/결제대행 적용 완료. 최종 수락 후 생산 진행도 공유 단계로 이동합니다.</div>
          </div>
          <button type="button" class="btn-primary scenario-order-accept" style="white-space:nowrap;"><i class="ri-check-line"></i> 최종 발주 수락</button>
        </div>
      `);
    }

    // 체크박스 4개를 모두 미리 체크 + disabled로 — "이미 확정된 항목" 시각화.
    // 시연자는 노란 바의 "최종 발주 수락" 버튼만 누르면 되도록 노이즈 제거.
    orders.querySelectorAll('.mw-list-item input[type="checkbox"]').forEach((cb) => {
      cb.checked = true;
      cb.disabled = true;
      const item = cb.closest('.mw-list-item');
      if (item && !item.querySelector('.scenario-checked-badge')) {
        item.insertAdjacentHTML('beforeend', '<span class="scenario-checked-badge mw-badge green" style="margin-left:8px;">확정</span>');
      }
    });

    const firstMeta = orders.querySelector('.mw-list-meta');
    if (firstMeta) firstMeta.textContent = 'PO-2025-00123 · Bracket Assembly · AL6061 100 EA';

    const callout = orders.querySelector('.mw-callout');
    if (callout) callout.textContent = '계약서와 NDA는 관리자 검수 후 클라이언트에게 전달되었습니다. 최종 수락 후 작업 스케줄이 확정됩니다.';

    if (production) {
      const pTitle = production.querySelector('.mw-card-title');
      const pSub = production.querySelector('.mw-card-sub');
      if (pTitle) pTitle.innerHTML = '<i class="ri-settings-3-line"></i> 생산 진행도 공유';
      if (pSub) pSub.textContent = '원자재 입고, 가공 시작, 후처리, 검사, 포장 이벤트를 클라이언트에게 공유합니다.';
    }
  }

  function applyAdminScenario() {
    insertScenarioPanel(scenarioPanel({
      kicker: 'Admin control',
      title: '관리자 관제: 신규 RFQ 접수',
      desc: '관리자는 직접 주문을 대행하기보다 RFQ, 매칭, 계약/보안, 생산, 납품, 리뷰 DB 상태가 정상으로 쌓이는지 확인합니다. 상단 KPI는 운영 환경의 누적 통계이며, 이번 시연 거래는 그 중 1건입니다.',
      chip: 'AI 분석 검수',
      active: 'AI 보완',
      items: [
        ['신규 요청', 'RFQ-20260508-001 · 도현로보틱스'],
        ['클라이언트', '도현로보틱스 / 이도현'],
        ['요청 상태', 'AI 분석 검수 진행 중'],
        ['관제 영역', '견적 → 매칭 → 계약 → 생산 → 납품 → 리뷰']
      ],
      links: [
        { href: '#ai', label: 'AI 분석 로그' },
        { href: '#matching', label: '매칭 관리', className: 'btn-outline' },
        { href: '#delivery', label: '납품·정산 로그', className: 'btn-outline' },
        { href: '#reviews', label: '리뷰 DB', className: 'btn-outline' }
      ]
    }));

    applyAdminAiLogScenario();
    applyAdminMatchingScenario();
    applyAdminReviewsScenario();
  }

  function applyAdminReviewsScenario() {
    // 최근 완료 거래 리뷰 행은 시연 step 20(#reviews)에서만 의미가 있음 (그 이전엔 미래 상태)
    if (location.hash !== '#reviews') return;

    const reviewsCard = document.getElementById('reviews');
    if (!reviewsCard) return;
    if (reviewsCard.querySelector('.scenario-admin-review-row')) return;

    // 시연 20번: PO-2025-00123 거래의 리뷰 DB 반영 라인이 명시적으로 보여야 한다.
    reviewsCard.insertAdjacentHTML('beforeend', `
      <div class="scenario-admin-review-row" style="margin-top:16px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;padding:16px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:12px;font-weight:900;color:#047857;margin-bottom:6px;">최근 완료 거래 리뷰</div>
            <div style="font-size:18px;font-weight:900;color:#111827;">PO-2025-00123 · 도현로보틱스 → 스마트정밀 · 5.0</div>
            <div style="font-size:13px;color:#475569;margin-top:6px;">Bracket Assembly · 6,250,000원 · 거래 상태 completed · 리뷰 DB 반영 완료</div>
          </div>
          <span class="mw-badge green">DB 반영 완료</span>
        </div>
      </div>
    `);
  }

  function applyAdminMatchingScenario() {
    const matching = document.getElementById('matching');
    if (!matching) return;

    const sent = supplierReplySent() || (window.__immaAdminMatchingClicks || 0) >= 2;
    const title = matching.querySelector('.mw-card-title');
    const sub = matching.querySelector('.mw-card-sub');
    const badge = matching.querySelector('.mw-card-head .mw-badge');
    if (title) title.innerHTML = '<i class="ri-links-line"></i> 업체 매칭·작업정보 수신 현황';
    if (sub) sub.textContent = '추천 업체 선별, 오더 공개, 업체 견적·납기 회신, 클라이언트 전달 상태를 확인합니다.';
    if (badge) {
      badge.className = `mw-badge ${sent ? 'green' : 'blue'}`;
      badge.textContent = sent ? '작업정보 수신' : '후보 3곳';
    }

    const rows = matching.querySelectorAll('.mw-list .mw-list-item');
    const demoRows = [
      ['스마트정밀', 'AL6061 · CNC 가공/아노다이징/조립 가능 · 평점 4.8 · 가동률 78%'],
      ['장밀테크 주식회사', 'CNC 가공 · 표면처리 연계 가능 · 평점 4.6 · 일정 검토중'],
      ['에이원 가공', '밀링/후처리 가능 · 평점 4.5 · 납기 여유 필요']
    ];
    rows.forEach((row, index) => {
      const data = demoRows[index];
      if (!data) return;
      const rowTitle = row.querySelector('.mw-list-title');
      const rowMeta = row.querySelector('.mw-list-meta');
      if (rowTitle) rowTitle.textContent = data[0];
      if (rowMeta) rowMeta.textContent = data[1];
    });

    const oldPanel = matching.querySelector('.scenario-admin-reply');
    if (oldPanel) oldPanel.remove();

    const panelHtml = sent ? `
      <div class="scenario-admin-reply" style="margin-top:16px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;padding:16px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:12px;font-weight:900;color:#047857;margin-bottom:6px;">업체 작업정보 수신</div>
            <div style="font-size:20px;font-weight:900;color:#111827;">스마트정밀 견적·납기 회신 도착</div>
            <div style="font-size:14px;color:#475569;margin-top:6px;">RFQ-20260508-001 작업정보가 관리자 관제에 들어왔고 클라이언트 비교 화면에 반영된 상태입니다.</div>
          </div>
          <span class="mw-badge green">클라이언트 전달 완료</span>
        </div>
        <div class="mw-grid-4" style="margin-top:14px;">
          <div class="mw-list-item soft"><div><div class="mw-list-meta">업체</div><div class="mw-list-title">스마트정밀</div></div></div>
          <div class="mw-list-item soft"><div><div class="mw-list-meta">견적 금액</div><div class="mw-list-title">6,250,000원</div></div></div>
          <div class="mw-list-item soft"><div><div class="mw-list-meta">예상 납기</div><div class="mw-list-title">7일 · 2026-06-15</div></div></div>
          <div class="mw-list-item soft"><div><div class="mw-list-meta">품질 인증</div><div class="mw-list-title">외부 성적서 가능</div></div></div>
        </div>
        <div class="mw-row-actions" style="justify-content:flex-end;margin-top:14px;">
          <button class="btn-primary"><i class="ri-send-plane-line"></i> 클라이언트에게 전달 완료</button>
        </div>
      </div>
    ` : `
      <div class="scenario-admin-reply" style="margin-top:16px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:12px;padding:16px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:12px;font-weight:900;color:#1d4ed8;margin-bottom:6px;">오더 공개중</div>
            <div style="font-size:20px;font-weight:900;color:#111827;">스마트정밀 작업정보 회신 대기</div>
            <div style="font-size:14px;color:#475569;margin-top:6px;">가공업체 창에서 작업정보 발송을 누른 뒤, 후보 데이터 갱신을 누르면 견적·납기 수신 상태로 바뀝니다.</div>
          </div>
          <span class="mw-badge blue">회신 대기</span>
        </div>
      </div>
    `;

    const actions = matching.querySelector('.mw-row-actions');
    if (actions) actions.insertAdjacentHTML('afterend', panelHtml);
    else matching.insertAdjacentHTML('beforeend', panelHtml);
  }

  function handleAdminMatchingButton(btn, text) {
    if (!btn.closest('#matching')) return false;

    if (text.includes('후보 데이터 갱신')) {
      window.__immaAdminMatchingClicks = 2;
      demoStorageSet('immaDemoSupplierReplySent', '1');
      applyAdminMatchingScenario();
      const reply = document.querySelector('#matching .scenario-admin-reply');
      if (reply) reply.scrollIntoView({ block: 'center', behavior: 'smooth' });
      toast('스마트정밀 견적·납기 회신을 수신하고 클라이언트 비교 화면에 전달했습니다.', 'success');
      return true;
    }

    if (text.includes('후보 재선별')) {
      toast('현재 RFQ 조건 기준으로 스마트정밀을 1순위 후보로 유지했습니다.', 'info');
      return true;
    }

    return false;
  }

  function applyAdminAiLogScenario() {
    const aiCard = document.getElementById('ai');
    if (!aiCard) return;

    const title = aiCard.querySelector('.mw-card-title');
    const sub = aiCard.querySelector('.mw-card-sub');
    const badge = aiCard.querySelector('.mw-card-head .mw-badge');
    if (title) title.innerHTML = '<i class="ri-brain-line"></i> AI 분석 로그';
    if (sub) sub.textContent = '도면 이미지와 입력값을 비교해 누락 정보와 보완 필요 항목을 기록합니다.';
    if (badge) {
      badge.textContent = '보완 필요 1건';
      badge.className = 'mw-badge yellow';
    }

    if (!aiCard.querySelector('.scenario-ai-summary')) {
      const head = aiCard.querySelector('.mw-card-head');
      head?.insertAdjacentHTML('afterend', `
        <div class="scenario-ai-summary scenario-note" style="margin:14px 0 14px;">
          <strong>RFQ-20260508-001 / 도현로보틱스 / Bracket Assembly</strong><br>
          보완 필요 항목: 구멍 Ø12mm, 아노다이징 흑색, 조립/수령 조건
        </div>
      `);
    }

    const headers = aiCard.querySelectorAll('thead th');
    ['견적번호', '요청 정보', '보완 필요 항목', '데이터 출처', '현재 상태'].forEach((label, index) => {
      if (headers[index]) headers[index].textContent = label;
    });

    const rows = aiCard.querySelectorAll('tbody tr');
    if (rows[0]) {
      rows[0].innerHTML = `
        <td class="mw-id">RFQ-20260508-001</td>
        <td><strong>도현로보틱스</strong><br><span style="color:#64748b;">Bracket Assembly</span></td>
        <td>구멍 Ø12mm · 아노다이징 흑색 · 조립/수령 조건</td>
        <td>도면 OCR · 견적 입력값</td>
        <td><span class="mw-badge yellow">클라이언트 보완 대기</span></td>
      `;
    }
    if (rows[1]) {
      rows[1].innerHTML = `
        <td class="mw-id">RFQ-20260508-002</td>
        <td>테스트 거래</td>
        <td>총 수량과 양산 계획 불일치</td>
        <td>견적 요청서</td>
        <td><span class="mw-badge blue">보완 데이터 수집중</span></td>
      `;
    }
    if (rows[2]) {
      rows[2].innerHTML = `
        <td class="mw-id">RFQ-20260508-003</td>
        <td>품질 인증 옵션</td>
        <td>외부 성적서 요청 여부 확인</td>
        <td>품질 옵션</td>
        <td><span class="mw-badge green">데이터 보완 완료</span></td>
      `;
    }
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"], .btn-submit, .imma-modal-btn');
    if (!submitButton) return;
    event.preventDefault();
    routeFromContext(textOf(submitButton));
  });

  document.addEventListener('click', (event) => {
    const demoTarget = event.target.closest('[data-demo-action]');
    if (demoTarget) {
      const action = demoTarget.getAttribute('data-demo-action');
      if (action === 'supplier-detail') {
        supplierDetailFrom(demoTarget);
        toast('업체 상세 정보와 리뷰, 장비, 가공 가능 범위를 확인했습니다.', 'info');
      }
      else if (action === 'support-ticket') toast('1:1 문의 접수 화면으로 이어집니다.', 'info');
      else toast('상세 정보를 확인했습니다.', 'info');
    }

    const link = event.target.closest('a');
    if (link) {
      const href = link.getAttribute('href') || '';
      if (page === '/matching-ui' && href.startsWith('/order-management')) {
        demoStorageSet('immaDemoClientPaid', '0');
        demoStorageSet('immaDemoProductionShared', '0');
      }
      handleDeadLink(link, event);
    }

    const button = event.target.closest('button');
    if (!button || button.getAttribute('onclick')) return;

    event.preventDefault();
    handleActionButton(button, event);
  });

  function initPage() {
    initPreviewMode();
    applyScenarioDemo();
    initHashNav();
    initOrderProductionSync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    initPage();
  }
}());
