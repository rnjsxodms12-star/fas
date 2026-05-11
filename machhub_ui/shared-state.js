// shared-state.js - Centralized state management for 3-window demo
const MACHHUB_KEY = "machhub_demo_state";

const defaultState = {
  rfqId: "RFQ-001",
  status: "draft",

  rfq: {
    title: "SUS304 브라켓",
    quantity: "100EA",
    material: "SUS304",
    process: "CNC 밀링",
    region: "경기도 화성시",
    deadline: "7일",
    budget: "500 ~ 800만원"
  },

  quote: null,
  selectedSupplier: null,
  completionRequested: false,
  customerEvaluation: null,
  dispute: null,
  adminDecision: null,

  logs: [
    {
      time: new Date().toLocaleTimeString(),
      text: "MachHub 3창 연동 실시간 데모 시스템이 가동되었습니다."
    }
  ]
};

function getState() {
  const raw = localStorage.getItem(MACHHUB_KEY);
  if (!raw) {
    localStorage.setItem(MACHHUB_KEY, JSON.stringify(defaultState));
    return structuredClone(defaultState);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    localStorage.setItem(MACHHUB_KEY, JSON.stringify(defaultState));
    return structuredClone(defaultState);
  }
}

function saveState(state) {
  localStorage.setItem(MACHHUB_KEY, JSON.stringify(state));
}

function addLog(state, text) {
  state.logs.unshift({
    time: new Date().toLocaleTimeString(),
    text
  });
  state.logs = state.logs.slice(0, 12); // Keep only recent 12 logs
}

function updateState(mutator) {
  const state = getState();
  mutator(state);
  saveState(state);
  // Trigger update for the same window
  window.dispatchEvent(new Event("machhub-state-updated"));
}

function resetDemo() {
  localStorage.setItem(MACHHUB_KEY, JSON.stringify(defaultState));
  window.dispatchEvent(new Event("machhub-state-updated"));
}

function getStatusLabel(status) {
  const labels = {
    draft: "요청 대기",
    submitted: "요청 완료",
    available_to_suppliers: "파트너 모집 중",
    quote_submitted: "견적 제출됨",
    awarded: "계약 체결",
    in_progress: "가공 진행 중",
    completed_claim: "완료 확인 요청",
    confirmed: "거래 종료",
    disputed: "분쟁 발생",
    evidence_submitted: "증빙 제출됨",
    resolved: "중재 완료"
  };
  return labels[status] || status;
}

function subscribeRender(render) {
  window.addEventListener("storage", render);
  window.addEventListener("machhub-state-updated", render);
  document.addEventListener("DOMContentLoaded", render);
}
