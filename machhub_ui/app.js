document.addEventListener('DOMContentLoaded', () => {
    // Collect all views
    const views = {
        signup: document.getElementById('view-signup'),
        orderList: document.getElementById('view-order-list'),
        quoteInput: document.getElementById('view-quote-input'),
        workManagement: document.getElementById('view-work-management'),
        payment: document.getElementById('view-payment'),
        review: document.getElementById('view-review')
    };

    const headerTitle = document.getElementById('header-title');
    const backBtn = document.getElementById('back-btn');
    const bottomNav = document.getElementById('bottom-nav');
    const navItems = document.querySelectorAll('.nav-item');

    let currentView = 'signup';

    function navigateTo(viewId, title) {
        // Hide all views
        Object.values(views).forEach(view => {
            if (view) view.classList.remove('active');
        });

        // Show target view
        if (views[viewId]) {
            views[viewId].classList.add('active');
        }
        headerTitle.textContent = title;
        currentView = viewId;

        // Manage Header Back Button
        if (['signup', 'orderList', 'workManagement', 'payment', 'review'].includes(viewId)) {
            backBtn.classList.add('hidden');
        } else {
            backBtn.classList.remove('hidden');
        }
        
        // Manage Bottom Nav Visibility
        if (viewId === 'signup' || viewId === 'quoteInput') {
            bottomNav.classList.add('hidden');
        } else {
            bottomNav.classList.remove('hidden');
            updateNavActiveState(viewId);
        }
        
        // Scroll to top of the view
        document.querySelectorAll('.view').forEach(v => v.scrollTop = 0);
    }

    function updateNavActiveState(viewId) {
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-target') === 'view-' + viewId.replace(/[A-Z]/g, m => "-" + m.toLowerCase())) {
                 item.classList.add('active');
            } else if (viewId === 'orderList' && item.getAttribute('data-target') === 'view-order-list') {
                 item.classList.add('active');
            }
        });
    }

    // Bottom Navigation Clicks
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            if (target === 'view-order-list') navigateTo('orderList', '새 주문 확인');
            if (target === 'view-work-management') navigateTo('workManagement', '작업 관리');
            if (target === 'view-payment') navigateTo('payment', '결제 및 정산');
            if (target === 'view-review') {
                navigateTo('review', '리뷰 관리');
                loadReviews(); // Fetch real data from DB
            }
        });
    });

    // Fetch Reviews from Backend API
    async function loadReviews() {
        const reviewContainer = document.getElementById('review-list-container');
        if (!reviewContainer) return;
        
        try {
            const response = await fetch('https://fas-production-c5f2.up.railway.app/api/reviews');
            const result = await response.json();
            
            if (result.status === 'success') {
                const reviews = result.data;
                reviewContainer.innerHTML = ''; // Clear loading state
                
                if (reviews.length === 0) {
                    reviewContainer.innerHTML = '<p class="text-center text-muted">등록된 리뷰가 없습니다.</p>';
                    return;
                }
                
                reviews.forEach(review => {
                    const fullStars = Math.floor(review.rating_overall);
                    const starsHTML = '<i class="ri-star-fill text-warning"></i>'.repeat(fullStars);
                    
                    const reviewHtml = `
                        <div class="review-card">
                            <div class="review-header">
                                <span class="client-name">${review.buyer_name}</span>
                                <span class="stars">${starsHTML} (${review.rating_overall})</span>
                            </div>
                            <p class="review-text">${review.comment}</p>
                            <div class="review-tags">
                                <span class="tag">품질: ${review.rating_quality}</span>
                                <span class="tag">납기: ${review.rating_delivery}</span>
                                <span class="tag">소통: ${review.rating_communication}</span>
                            </div>
                        </div>
                    `;
                    reviewContainer.insertAdjacentHTML('beforeend', reviewHtml);
                });
            }
        } catch (error) {
            console.error("Failed to load reviews:", error);
            reviewContainer.innerHTML = '<p class="text-center text-danger">서버에서 리뷰를 불러오지 못했습니다. 서버(server.py)가 실행 중인지 확인하세요.</p>';
        }
    }

    // Back button logic
    backBtn.addEventListener('click', () => {
        if (currentView === 'quoteInput') {
            navigateTo('orderList', '새 주문 확인');
        }
    });

    // 1. Signup Submit -> Enter Main App
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            navigateTo('orderList', '새 주문 확인');
        });
    }

    // 2. Reject Order
    const btnReject = document.getElementById('btn-reject');
    if (btnReject) {
        btnReject.addEventListener('click', () => {
            if(confirm('이 주문을 거절하시겠습니까?')) {
                alert('주문이 거절되었습니다.');
            }
        });
    }

    // 3. Match / Accept Order -> Go to Quote Input (Step 2)
    const btnMatch = document.getElementById('btn-match');
    if (btnMatch) {
        btnMatch.addEventListener('click', () => {
            navigateTo('quoteInput', '견적 입력');
        });
    }

    // 4. Quote Form Submit
    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('견적이 성공적으로 발송되었습니다!');
            navigateTo('workManagement', '작업 관리'); // Send to work management to show progress flow
        });
    }
});
