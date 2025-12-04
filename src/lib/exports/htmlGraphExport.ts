import { StoryNode, StoryEdge } from "@/lib/types/editor";

interface HTMLExportOptions {
  includeImages: boolean;
  roomTitle: string;
  roomSubtitle?: string;
  exportDate: string;
}

function escapeHtml(text: string): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateText(text: string, maxLength: number = 150): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    scene: "📖",
    choice: "🔀",
    ending: "🏁",
    note: "📝",
  };
  return icons[type] || "📄";
}

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    scene: "#3b82f6",
    choice: "#8b5cf6",
    ending: "#10b981",
    note: "#f59e0b",
  };
  return colors[type] || "#6b7280";
}

/**
 * Generates an interactive HTML visualization of a story graph with nodes and connections.
 * Nodes are displayed as cards with truncated content that can be expanded on click.
 */
export function generateStoryGraphHTML(
  nodes: StoryNode[],
  edges: StoryEdge[],
  options: HTMLExportOptions
): string {
  const { roomTitle, roomSubtitle, exportDate } = options;

  // Calculate canvas bounds based on node positions
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + 280); // Node width
    maxY = Math.max(maxY, node.position.y + 200); // Approximate node height
  });

  const canvasWidth = Math.max(maxX - minX + 100, 1200);
  const canvasHeight = Math.max(maxY - minY + 100, 800);
  const offsetX = -minX + 50;
  const offsetY = -minY + 50;

  // Generate SVG connections
  let svgConnections = '';
  edges.forEach((edge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;

    const x1 = sourceNode.position.x + offsetX + 140; // Center of source node
    const y1 = sourceNode.position.y + offsetY + 100;
    const x2 = targetNode.position.x + offsetX + 140; // Center of target node
    const y2 = targetNode.position.y + offsetY + 100;

    // Create curved path
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const curve = Math.min(dist * 0.2, 50);
    const perpX = -dy / dist * curve;
    const perpY = dx / dist * curve;

    svgConnections += `
      <path 
        d="M ${x1} ${y1} Q ${midX + perpX} ${midY + perpY} ${x2} ${y2}"
        class="edge"
        stroke="${edge.type === 'choice' ? '#8b5cf6' : '#64748b'}"
        stroke-width="2"
        fill="none"
        marker-end="url(#arrowhead)"
      />`;
    
    if (edge.label) {
      svgConnections += `
      <text 
        x="${midX + perpX}" 
        y="${midY + perpY - 5}" 
        class="edge-label"
        text-anchor="middle"
      >${escapeHtml(edge.label)}</text>`;
    }
  });

  // Generate node HTML
  let nodesHTML = '';
  nodes.forEach(node => {
    const icon = getNodeIcon(node.type);
    const color = node.color || getNodeColor(node.type);
    const truncated = truncateText(node.content.text || "No content", 150);
    const hasMoreContent = (node.content.text || "").length > 150;
    
    // Get image from media if available
    let imageHTML = '';
    if (node.content.media && node.content.media.length > 0) {
      const imageMedia = node.content.media.find(m => m.type === 'image');
      if (imageMedia) {
        let imageSrc = '';
        
        if (imageMedia.source === 'url' && imageMedia.url) {
          imageSrc = imageMedia.url;
        } else if (imageMedia.source === 'uploaded' && (imageMedia as any).embeddedDataUri) {
          imageSrc = (imageMedia as any).embeddedDataUri;
        }
        
        if (imageSrc) {
          const caption = imageMedia.caption ? escapeHtml(imageMedia.caption) : escapeHtml(node.title);
          imageHTML = `<img src="${escapeHtml(imageSrc)}" alt="${caption}" class="node-image" />`;
        }
      }
    }
    
    nodesHTML += `
    <div 
      class="node" 
      data-node-id="${escapeHtml(node.id)}"
      style="left: ${node.position.x + offsetX}px; top: ${node.position.y + offsetY}px; border-color: ${color};"
    >
      <div class="node-header" style="background: ${color};">
        <span class="node-icon">${icon}</span>
        <span class="node-title">${escapeHtml(node.title)}</span>
        <span class="node-type">${node.type}</span>
      </div>
      <div class="node-body">
        ${imageHTML}
        <div class="node-content" data-full-content="${escapeHtml(node.content.text || "No content")}">
          <p class="content-preview">${escapeHtml(truncated)}</p>
          ${hasMoreContent ? '<button class="expand-btn" onclick="toggleContent(this)">Show More</button>' : ''}
        </div>
        ${node.content.summary ? `<div class="node-summary">💡 ${escapeHtml(node.content.summary)}</div>` : ''}
        ${node.labels.length > 0 ? `<div class="node-labels">${node.labels.map(l => `<span class="label">${escapeHtml(l)}</span>`).join('')}</div>` : ''}
      </div>
    </div>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(roomTitle)} - Story Graph</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      overflow-x: hidden;
    }

    .header {
      background: white;
      padding: 20px 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .header h1 {
      font-size: 2em;
      color: #1a1a1a;
      margin-bottom: 5px;
    }

    .header .subtitle {
      color: #666;
      font-size: 1.1em;
      font-style: italic;
    }

    .header .metadata {
      color: #888;
      font-size: 0.9em;
      margin-top: 8px;
    }

    .controls {
      background: white;
      padding: 15px 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .controls button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .controls button:hover {
      background: #f5f5f5;
      border-color: #999;
    }

    .graph-container {
      position: relative;
      width: ${canvasWidth}px;
      height: ${canvasHeight}px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }

    .graph-canvas {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: 
        repeating-linear-gradient(0deg, transparent, transparent 19px, #f0f0f0 19px, #f0f0f0 20px),
        repeating-linear-gradient(90deg, transparent, transparent 19px, #f0f0f0 19px, #f0f0f0 20px);
      background-size: 20px 20px;
    }

    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }

    .edge-label {
      font-size: 12px;
      fill: #475569;
      pointer-events: none;
      font-weight: 500;
    }

    .node {
      position: absolute;
      width: 280px;
      background: white;
      border: 3px solid;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
      z-index: 10;
    }

    .node:hover {
      transform: scale(1.02);
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      z-index: 100;
    }

    .node-header {
      padding: 12px 15px;
      color: white;
      border-radius: 7px 7px 0 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }

    .node-icon {
      font-size: 1.2em;
    }

    .node-title {
      flex: 1;
      font-size: 1em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .node-type {
      font-size: 0.75em;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .node-body {
      padding: 15px;
    }

    .node-image {
      width: 100%;
      height: auto;
      max-height: 150px;
      object-fit: cover;
      border-radius: 6px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .node-image:hover {
      transform: scale(1.02);
    }

    .node-content {
      font-size: 0.9em;
      color: #333;
      line-height: 1.5;
    }

    .content-preview {
      margin-bottom: 8px;
    }

    .expand-btn {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.85em;
      cursor: pointer;
      transition: all 0.2s;
    }

    .expand-btn:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
    }

    .node-summary {
      margin-top: 10px;
      padding: 8px 12px;
      background: #fef3c7;
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
      font-size: 0.85em;
      color: #92400e;
    }

    .node-labels {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .label {
      display: inline-block;
      padding: 3px 8px;
      background: #e0e7ff;
      color: #4338ca;
      border-radius: 12px;
      font-size: 0.75em;
      font-weight: 500;
    }

    .stats {
      background: white;
      padding: 20px 40px;
      margin: 40px auto;
      max-width: 800px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      text-align: center;
    }

    .stats h3 {
      margin-bottom: 15px;
      color: #1a1a1a;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .stat-item {
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: #667eea;
    }

    .stat-label {
      font-size: 0.9em;
      color: #64748b;
      margin-top: 5px;
    }

    .expanded .content-preview {
      white-space: pre-wrap;
    }

    /* Image Modal Styles */
    .image-modal {
      display: none;
      position: fixed;
      z-index: 10000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }

    .modal-content {
      max-width: 90%;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    }

    .modal-close {
      position: absolute;
      top: 20px;
      right: 35px;
      color: #f1f1f1;
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
      transition: 0.3s;
    }

    .modal-close:hover,
    .modal-close:focus {
      color: #bbb;
    }

    #modalCaption {
      margin-top: 20px;
      text-align: center;
      color: #ccc;
      padding: 10px 20px;
      font-size: 16px;
      max-width: 80%;
    }

    @media print {
      body { background: white; }
      .controls { display: none; }
      .image-modal { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(roomTitle)}</h1>
    ${roomSubtitle ? `<p class="subtitle">${escapeHtml(roomSubtitle)}</p>` : ''}
    <p class="metadata">Exported on ${exportDate} • Interactive Story Graph</p>
  </div>

  <div class="controls">
    <button onclick="zoomIn()">🔍 Zoom In</button>
    <button onclick="zoomOut()">🔍 Zoom Out</button>
    <button onclick="resetZoom()">↺ Reset View</button>
    <button onclick="window.print()">🖨️ Print</button>
  </div>

  <div class="graph-container">
    <div class="graph-canvas" id="canvas">
      <svg>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>
        ${svgConnections}
      </svg>
      ${nodesHTML}
    </div>
  </div>

  <div class="stats">
    <h3>📊 Story Statistics</h3>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">${nodes.length}</div>
        <div class="stat-label">Total Nodes</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${edges.length}</div>
        <div class="stat-label">Connections</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${nodes.filter(n => n.type === 'scene').length}</div>
        <div class="stat-label">Scenes</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${nodes.filter(n => n.type === 'choice').length}</div>
        <div class="stat-label">Choices</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${nodes.filter(n => n.type === 'ending').length}</div>
        <div class="stat-label">Endings</div>
      </div>
    </div>
  </div>

  <!-- Image Modal -->
  <div id="imageModal" class="image-modal" onclick="closeImageModal()">
    <span class="modal-close">&times;</span>
    <img class="modal-content" id="modalImage">
    <div id="modalCaption"></div>
  </div>

  <script>
    function toggleContent(btn) {
      const contentDiv = btn.parentElement;
      const preview = contentDiv.querySelector('.content-preview');
      const fullText = contentDiv.getAttribute('data-full-content');
      
      if (contentDiv.classList.contains('expanded')) {
        contentDiv.classList.remove('expanded');
        preview.innerHTML = fullText.substring(0, 150).replace(/&lt;br&gt;/g, '<br>') + '...';
        btn.textContent = 'Show More';
      } else {
        contentDiv.classList.add('expanded');
        preview.innerHTML = fullText.replace(/&lt;br&gt;/g, '<br>');
        btn.textContent = 'Show Less';
      }
    }

    let currentZoom = 1;
    
    function zoomIn() {
      currentZoom = Math.min(currentZoom + 0.2, 2);
      applyZoom();
    }
    
    function zoomOut() {
      currentZoom = Math.max(currentZoom - 0.2, 0.5);
      applyZoom();
    }
    
    function resetZoom() {
      currentZoom = 1;
      applyZoom();
    }
    
    function applyZoom() {
      const canvas = document.getElementById('canvas');
      canvas.style.transform = \`scale(\${currentZoom})\`;
      canvas.style.transformOrigin = 'top left';
    }

    // Image modal functionality
    document.addEventListener('DOMContentLoaded', function() {
      const images = document.querySelectorAll('.node-image');
      images.forEach(img => {
        img.addEventListener('click', function(e) {
          e.stopPropagation();
          openImageModal(this.src, this.alt);
        });
      });
    });

    function openImageModal(src, alt) {
      const modal = document.getElementById('imageModal');
      const modalImg = document.getElementById('modalImage');
      const caption = document.getElementById('modalCaption');
      
      modal.style.display = 'flex';
      modalImg.src = src;
      caption.textContent = alt;
    }

    function closeImageModal() {
      document.getElementById('imageModal').style.display = 'none';
    }

    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeImageModal();
      }
    });
  </script>
</body>
</html>`;
}
