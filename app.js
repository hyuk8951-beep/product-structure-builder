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
const gapSlider = document.getElementById('gap-slider');
const nodeTextInput = document.getElementById('node-text');
const nodeColorInput = document.getElementById('node-color');
const btnClearColor = document.getElementById('btn-clear-color');
const btnAddChild = document.getElementById('btn-add-child');
const btnAddSibling = document.getElementById('btn-add-sibling');
const btnDelete = document.getElementById('btn-delete');
const selectedNodeInfo = document.getElementById('selected-node-info');
const btnDownload = document.getElementById('btn-download');
const btnReset = document.getElementById('btn-reset');

// Level Color Inputs
const colorInputs = {
    0: document.getElementById('color-l0'),
    1: document.getElementById('color-l1'),
    2: document.getElementById('color-l2'),
    3: document.getElementById('color-l3'),
};

// Initialize
function init() {
    loadLevelColors();
    renderTree();
    setupEventListeners();
}

function saveTree() {
    localStorage.setItem('productTreeData', JSON.stringify(treeData));
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
    
    // Apply custom color if set
    if (nodeData.color) {
        content.style.backgroundColor = nodeData.color;
    }

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

    return wrapper;
}

// Interaction
function selectNode(id) {
    selectedNodeId = id;
    renderTree();
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
    // Gap slider
    gapSlider.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--node-gap', `${e.target.value}px`);
    });

    // Level Colors
    Object.keys(colorInputs).forEach(level => {
        colorInputs[level].addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty(`--l${level}-bg`, color);
            localStorage.setItem(`levelColor_${level}`, color);
        });
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
        selectedNodeId = null;
        renderTree();
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
