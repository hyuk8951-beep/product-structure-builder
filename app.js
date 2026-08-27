// Default initial tree data resembling the user's image
const defaultTreeData = {
    id: 'root',
    text: '종합식보호장치 모듈',
    level: 0,
    color: null,
    children: [
        {
            id: 'm100', text: 'M100 냉/난방장치 조립체', level: 1, color: null, children: [
                {
                    id: 'm110', text: 'M110 HVAC 조립체', level: 2, color: null, children: [
                        { id: 'm111', text: 'M111 케이싱, AL몰드', level: 3, color: null, children: [] },
                        { id: 'm112', text: 'M112 난방 코일 모듈', level: 3, color: null, children: [] }
                    ]
                }
            ]
        },
        {
            id: 'm200', text: 'M200 양압장치 조립체', level: 1, color: null, children: []
        }
    ]
};

let treeData = JSON.parse(localStorage.getItem('productTreeData')) || defaultTreeData;
let selectedNodeId = null;
let nodeCounter = Date.now(); // for unique IDs

// DOM Elements
const treeContainer = document.getElementById('tree-root');
// (gapSlider 삭제됨)
const nodeTextInput = document.getElementById('node-text');
const nodeColorInput = document.getElementById('node-color');
const btnClearColor = document.getElementById('btn-clear-color');
const btnAddChild = document.getElementById('btn-add-child');
const btnAddSibling = document.getElementById('btn-add-sibling');
const btnDelete = document.getElementById('btn-delete');
const selectedNodeInfo = document.getElementById('selected-node-info');
const btnDownload = document.getElementById('btn-download');
const btnReset = document.getElementById('btn-reset');

// Initialize
function init() {
    renderTree();
    setupEventListeners();
}

function saveTree() {
    localStorage.setItem('productTreeData', JSON.stringify(treeData));
}

function getMaxLevel(node) {
    let max = node.level;
    node.children.forEach(child => {
        max = Math.max(max, getMaxLevel(child));
    });
    return max;
}

function renderLevelColorInputs() {
    const maxLevel = Math.max(3, getMaxLevel(treeData)); // 최소 0~3단계는 표시
    const container = document.getElementById('level-colors-container');
    container.innerHTML = ''; 

    for (let i = 0; i <= maxLevel; i++) {
        const label = document.createElement('label');
        label.textContent = i === 0 ? '0단계 (최상위): ' : `${i}단계: `;
        
        const input = document.createElement('input');
        input.type = 'color';
        input.id = `color-l${i}`;
        input.dataset.level = i;
        
        // localStorage에서 색상 불러오기 또는 기본값
        const savedColor = localStorage.getItem(`levelColor_${i}`);
        if (savedColor) {
            input.value = savedColor;
        } else {
            // 기본 색상 설정
            if (i === 0) input.value = '#2d2d64';
            else if (i === 1) input.value = '#9b82c8';
            else if (i === 2) input.value = '#a5b1c2';
            else input.value = '#d1d8e0'; // 3단계 이상 기본값
        }
        
        // CSS 변수 즉시 업데이트
        document.documentElement.style.setProperty(`--l${i}-bg`, input.value);
        
        input.addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty(`--l${i}-bg`, color);
            localStorage.setItem(`levelColor_${i}`, color);
        });
        
        label.appendChild(input);
        container.appendChild(label);
    }
}

// Tree Traversal Helpers
function findNodeAndParent(data, id, parent = null) {
    if (data.id === id) return { node: data, parent };
    for (let i = 0; i < data.children.length; i++) {
        const result = findNodeAndParent(data.children[i], id, data);
        if (result) return result;
    }
    return null;
}

function findNode(id) {
    const result = findNodeAndParent(treeData, id);
    return result ? result.node : null;
}

// Rendering
function renderTree() {
    renderLevelColorInputs(); // 단계 확장에 따라 색상 UI 동기화
    treeContainer.innerHTML = '';
    const rootEl = createNodeElement(treeData, 0);
    treeContainer.appendChild(rootEl);
    updateControlsState();
}

function createNodeElement(nodeData, level) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('node-wrapper');
    wrapper.dataset.level = level;
    
    // Determine wrapper class based on level for layout
    if (level === 0) wrapper.classList.add('level-0-wrapper');
    else if (level === 1) wrapper.classList.add('level-1-wrapper');
    else wrapper.classList.add('sub-wrapper');

    // Node content (the visual box)
    const content = document.createElement('div');
    content.classList.add('node-content');
    content.textContent = nodeData.text;
    content.dataset.id = nodeData.id;
    if (nodeData.id === selectedNodeId) {
        content.classList.add('selected');
    }
    
    // Apply background and text color dynamically
    if (nodeData.color) {
        content.style.backgroundColor = nodeData.color;
    } else {
        content.style.backgroundColor = `var(--l${level}-bg, #d1d8e0)`;
    }
    // 텍스트 가독성을 위해 0~1단계는 흰색, 2단계 이상은 어두운 색 적용
    content.style.color = level <= 1 ? '#ffffff' : '#333333';

    content.addEventListener('click', (e) => {
        // 편집 중일 때는 선택 이벤트를 무시
        if (content.contentEditable === "true") return;
        e.stopPropagation();
        selectNode(nodeData.id);
    });

    content.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        content.contentEditable = "true";
        content.focus();
        
        // 텍스트 전체 선택
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(content);
        selection.removeAllRanges();
        selection.addRange(range);
    });

    content.addEventListener('blur', () => {
        content.contentEditable = "false";
        nodeData.text = content.textContent;
        saveTree();
        if (selectedNodeId === nodeData.id) {
            updateControlsState();
        }
    });

    content.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 줄바꿈 방지
            content.blur(); // 편집 종료
        }
    });

    if (level === 1) {
        // L1 전용 래퍼: 부모 라인 연결점과 자식 라인 연결점을 완벽히 정렬하기 위함
        const branchContainer = document.createElement('div');
        branchContainer.classList.add('tree-branch-container');
        
        // L1 노드를 구분하기 위한 클래스 추가 (::before 라인용)
        content.classList.add('level-1-node');
        branchContainer.appendChild(content);
        
        if (nodeData.children && nodeData.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.classList.add('sub-container');
            nodeData.children.forEach(child => {
                childrenContainer.appendChild(createNodeElement(child, level + 1));
            });
            branchContainer.appendChild(childrenContainer);
        }
        wrapper.appendChild(branchContainer);
    } else {
        wrapper.appendChild(content);

        // Children container
        if (nodeData.children && nodeData.children.length > 0) {
            const childrenContainer = document.createElement('div');
            if (level === 0) childrenContainer.classList.add('level-1-container');
            else childrenContainer.classList.add('sub-container');

            nodeData.children.forEach(child => {
                childrenContainer.appendChild(createNodeElement(child, level + 1));
            });
            wrapper.appendChild(childrenContainer);
        }
    }

    return wrapper;
}

// Interaction
function selectNode(id) {
    selectedNodeId = id;
    
    // 트리 전체를 다시 그리지 않고, DOM 클래스만 업데이트 (더블클릭 버그 방지)
    document.querySelectorAll('.node-content').forEach(el => {
        if (el.dataset.id === id) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
    
    updateControlsState();
}

function updateControlsState() {
    if (!selectedNodeId) {
        selectedNodeInfo.textContent = '선택 없음';
        nodeTextInput.value = '';
        nodeTextInput.disabled = true;
        nodeColorInput.value = '#ffffff';
        nodeColorInput.disabled = true;
        btnClearColor.disabled = true;
        btnAddChild.disabled = true;
        btnAddSibling.disabled = true;
        btnDelete.disabled = true;
        return;
    }

    const node = findNode(selectedNodeId);
    if (!node) return; // shouldn't happen

    selectedNodeInfo.textContent = `ID: ${node.id} (단계: ${node.level})`;
    
    nodeTextInput.disabled = false;
    nodeTextInput.value = node.text;
    
    nodeColorInput.disabled = false;
    // Default to the level color if no custom color
    nodeColorInput.value = node.color || getComputedStyle(document.documentElement).getPropertyValue(`--l${Math.min(node.level, 3)}-bg`).trim() || '#ffffff';
    
    btnClearColor.disabled = !node.color;
    
    btnAddChild.disabled = false;
    // Root cannot have siblings, cannot be deleted
    if (node.level === 0) {
        btnAddSibling.disabled = true;
        btnDelete.disabled = true;
    } else {
        btnAddSibling.disabled = false;
        btnDelete.disabled = false;
    }
}

// Event Listeners
function setupEventListeners() {
    // Gap sliders
    const gapSliderY = document.getElementById('gap-slider-y');
    const gapSliderX = document.getElementById('gap-slider-x');
    
    gapSliderY.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--node-gap-y', `${e.target.value}px`);
    });
    
    gapSliderX.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--node-gap-x', `${e.target.value}px`);
    });

    // Node Text
    nodeTextInput.addEventListener('input', (e) => {
        if (!selectedNodeId) return;
        const node = findNode(selectedNodeId);
        node.text = e.target.value;
        saveTree();
        renderTree();
    });

    // Node Color
    nodeColorInput.addEventListener('input', (e) => {
        if (!selectedNodeId) return;
        const node = findNode(selectedNodeId);
        node.color = e.target.value;
        saveTree();
        renderTree();
    });

    btnClearColor.addEventListener('click', () => {
        if (!selectedNodeId) return;
        const node = findNode(selectedNodeId);
        node.color = null;
        saveTree();
        renderTree();
    });

    // Node Actions
    btnAddChild.addEventListener('click', () => {
        if (!selectedNodeId) return;
        const node = findNode(selectedNodeId);
        const newLevel = node.level + 1;
        const newNode = {
            id: `node-${nodeCounter++}`,
            text: `새 항목 (L${newLevel})`,
            level: newLevel,
            color: null,
            children: []
        };
        node.children.push(newNode);
        saveTree();
        renderTree(); // 화면 업데이트
        selectNode(newNode.id);
    });

    btnAddSibling.addEventListener('click', () => {
        if (!selectedNodeId) return;
        const { node, parent } = findNodeAndParent(treeData, selectedNodeId);
        if (!parent) return; // Root has no sibling
        
        const newNode = {
            id: `node-${nodeCounter++}`,
            text: `새 항목 (L${node.level})`,
            level: node.level,
            color: null,
            children: []
        };
        const index = parent.children.findIndex(c => c.id === selectedNodeId);
        parent.children.splice(index + 1, 0, newNode);
        saveTree();
        renderTree(); // 화면 업데이트
        selectNode(newNode.id);
    });

    btnDelete.addEventListener('click', () => {
        if (!selectedNodeId) return;
        const { node, parent } = findNodeAndParent(treeData, selectedNodeId);
        if (!parent) {
            alert('최상위 노드는 삭제할 수 없습니다.');
            return; 
        }
        
        const index = parent.children.findIndex(c => c.id === selectedNodeId);
        parent.children.splice(index, 1);
        selectedNodeId = null;
        saveTree();
        renderTree();
    });

    // Canvas click to deselect
    treeContainer.addEventListener('click', () => {
        selectNode(null);
    });

    // Download PNG
    btnDownload.addEventListener('click', () => {
        // Temporarily remove selection styling for clean capture
        const tempSelected = selectedNodeId;
        selectedNodeId = null;
        renderTree();
        
        const captureArea = document.getElementById('capture-area');
        
        html2canvas(captureArea, {
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim(),
            scale: 2 // Higher resolution
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'product_structure.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Restore selection
            selectedNodeId = tempSelected;
            renderTree();
        });
    });

    // Reset
    btnReset.addEventListener('click', () => {
        if(confirm('정말로 트리를 초기화하시겠습니까? 모든 변경 사항이 삭제됩니다.')) {
            treeData = JSON.parse(JSON.stringify(defaultTreeData)); // Deep copy
            selectedNodeId = null;
            saveTree();
            renderTree();
        }
    });
}

function loadLevelColors() {
    Object.keys(colorInputs).forEach(level => {
        const savedColor = localStorage.getItem(`levelColor_${level}`);
        if (savedColor) {
            colorInputs[level].value = savedColor;
            document.documentElement.style.setProperty(`--l${level}-bg`, savedColor);
        } else {
            // init variable from default input value
            document.documentElement.style.setProperty(`--l${level}-bg`, colorInputs[level].value);
        }
    });
}

// Start
init();
