import React, { useState, useRef, useEffect } from 'react';
import { Save, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { GripVertical } from 'lucide-react';
import { jsPDF } from 'jspdf';


// Constants for our grid and layout
const G = 75;  // Grid size
const T = 175; // Text width
const H = '70%'; // Drawing height
const P = 8;   // Point radius
const D = 32;  // Hover area size
const MOBILE_BREAKPOINT = 425;  // Mobile width breakpoint in pixels

// Generate hash points for our grid
const HASH_COUNT = 10;
const HASH_POINTS = Array.from(
  { length: HASH_COUNT * 2 + 1 }, 
  (_, i) => ((i - HASH_COUNT) / HASH_COUNT) * 50 + 50
  );

const findClosestPoint = y => {
  return HASH_POINTS.reduce((prev, curr) => 
    Math.abs(curr - y) < Math.abs(prev - y) ? curr : prev
    );
};

const InteractiveDrawing = () => {
  // State management
  const [points, setPoints] = useState([]);
  const [ghostPoints, setGhostPoints] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [filename, setFilename] = useState('My Drawing');
  const [cursor, setCursor] = useState({ x: 0, y: 50 });
  const textareaRef = useRef(null);  // Add this here with other refs
  const [rotated, setRotated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [justDropped, setJustDropped] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [editText, setEditText] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [draggedDescriptionIndex, setDraggedDescriptionIndex] = useState(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState(null);
  const [previewPositions, setPreviewPositions] = useState([]);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const DEBOUNCE_TIME = 100; // milliseconds
  const [originalPoints, setOriginalPoints] = useState(null);
  const [originalIndex, setOriginalIndex] = useState(null);
  const [showPoints, setShowPoints] = useState(true);
  const [showBars, setShowBars] = useState(false);
  const [cumulativeType, setCumulativeType] = useState('none');
  const [editMode, setEditMode] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [touchedPointId, setTouchedPointId] = useState(null);
  const [tappedPoint, setTappedPoint] = useState(null);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [touchMoved, setTouchMoved] = useState(false);
  const [digitalPoints, setDigitalPoints] = useState(new Set());
  const [showDigitalCutout, setShowDigitalCutout] = useState(false);
  const [bluePoints, setBluePoints] = useState(new Set());
  const [showAnalyticsCutout, setShowAnalyticsCutout] = useState(false);
  const [cutoutType, setCutoutType] = useState('none');


  console.log('Mobile check:', { 
    isMobile, 
    windowWidth: window.innerWidth, 
    MOBILE_BREAKPOINT 
  });

  const handlePdfExport = async () => {
    console.log('Starting PDF export');
    const allPoints = getAllPoints();
    console.log('Points gathered:', allPoints);

    // Add the formatted filename here, right after getting allPoints
    const formattedFilename = `${filename}_${allPoints.length} Events_${calculateScores(points).total} Cml Score`;


    // Calculate minimum width for 15 points
    const minWidth = 16 * G;  // 15 points + 1 extra space
    const totalWidth = Math.max(minWidth, (allPoints.length + 1) * G);

    // Calculate scale to fit on letter paper (8.5 x 11 inches)
    const pageWidth = 11; // landscape letter width in inches
    const pageHeight = 8.5; // landscape letter height in inches
    const margins = 0.5; // half-inch margins
    const availableWidth = pageWidth - (margins * 2);
    const availableHeight = pageHeight - (margins * 2);
    
    const scale = Math.min(
      (availableWidth * 96) / totalWidth,
      (availableHeight * 96) / 600,
      1
      );

    console.log('Calculated dimensions:', { totalWidth, scale });


    // Create SVG content similar to your current export
    const svgContent = `
      <svg 
        width="${totalWidth * scale}px"
        height="${600 * scale}px" 
        viewBox="0 0 ${totalWidth} 600"
        style="background-color: white;"
        preserveAspectRatio="xMidYMid meet"
      >
        <!-- Your existing SVG content -->
        <defs>
          <pattern id="print-grid" width="${G}" height="100%" patternUnits="userSpaceOnUse">
      ${HASH_POINTS.map((hp, i) => `
              <line 
                x1="-6" y1="${hp}%" 
                x2="6" y2="${hp}%" 
                stroke="grey"
              />
        `).join('')}
            <line x1="${G}" y1="0" x2="${G}" y2="100%" stroke="grey"/>
          </pattern>
        </defs>

        <!-- Grid and points -->
        <rect x="${G}" width="${totalWidth - G}" height="100%" fill="url(#print-grid)"/>
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="grey"/>

        <!-- Points and lines -->
      ${allPoints.map((point, i) => i > 0 ? `
          <line 
            x1="${allPoints[i-1].x}" 
            y1="${allPoints[i-1].y}%" 
            x2="${point.x}" 
            y2="${point.y}%" 
            stroke="black" 
            stroke-width="2"
          />
        ` : '').join('')}

      ${allPoints.map(point => `
          <circle 
            cx="${point.x}" 
            cy="${point.y}%" 
            r="${P}" 
            fill="black"
          />
        `).join('')}
      </svg>
    `;

    // Inside your try block
    try {
      console.log('Creating PDF instance');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: 'letter'
      });

  // Add title and count right after PDF creation
      pdf.setFontSize(16);
      pdf.text(filename, margins, margins);

  // Add count below title
      pdf.setFontSize(12);
      pdf.text(`${allPoints.length} Events | Cumulative Score ${calculateScores(points).total}`, margins, margins + 0.3);

      const contentStart = margins + 0.5;

  // Add aspect ratio calculations
      const svgAspectRatio = 600 / totalWidth;
      const pageAspectRatio = (pageHeight - margins * 3) / (pageWidth - margins * 2);

  // Create a temporary canvas with higher resolution
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = totalWidth * scale * 2;
      canvas.height = 600 * scale * 2;
      ctx.scale(2, 2);

  // Create a temporary container and add SVG to DOM
      const container = document.createElement('div');
      container.innerHTML = svgContent;
      document.body.appendChild(container);

  // Get the SVG element
      const svgElement = container.querySelector('svg');

  // Convert SVG to data URL using canvas
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      console.log('Created SVG data URL');

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = async () => {
          console.log('Image loaded');
          try {
        // Draw image to canvas first
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

        // Convert canvas to PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png', 1.0);  // Added quality parameter
        
        pdf.addImage(
          pngDataUrl,
          'PNG',
          margins,
          contentStart,
          pageWidth - margins * 2,
          (pageWidth - margins * 2) * svgAspectRatio
          );
        console.log('Added image to PDF');

// Add vertical descriptions
        pdf.setFontSize(9);
        const baseCharLimit = 26;

        allPoints.forEach((point, i) => {
          const x = (point.x * scale / 96) + margins;

  // For 15 or fewer points, always use baseCharLimit
          let charLimit = baseCharLimit;
          if (allPoints.length > 15) {
            const pointRatio = allPoints.length / 15;
            const heightGain = (1 / scale);
            const additionalChars = Math.floor(baseCharLimit * Math.sqrt(pointRatio) * heightGain * 0.8);
            charLimit = baseCharLimit + additionalChars;
          }

  //The key factors for adjusting how aggressively the character count increases beyond 15 points are:
  //The 0.8 multiplier at the end - decreasing this will make the character count increase less aggressively, increasing it will allow more characters
  //The Math.sqrt(pointRatio) - using square root makes the increase more gradual. You could change this to just pointRatio for a more linear increase
  //The heightGain factor - this accounts for how much the scale shrinks as more points are added

  //For example:

  //More aggressive: Change 0.8 to 1.2
  //Less aggressive: Change 0.8 to 0.5
  //Much more aggressive: Remove Math.sqrt and just use pointRatio
  //Much less aggressive: Use Math.cbrt(pointRatio) (cube root) instead of square root

          let textToWrite = point.text || 'No description';

          console.log('Processing text:', {
            originalText: textToWrite,
            length: textToWrite.length,
            charLimit
          });

          if (textToWrite.length > charLimit) {
            const chunks = [];
            for (let i = 0; i < textToWrite.length; i += charLimit) {
              chunks.push(textToWrite.slice(i, i + charLimit));
            }
            textToWrite = chunks.join('\n');

            console.log('After chunking:', {
              chunks,
              chunkLengths: chunks.map(c => c.length),
              finalText: textToWrite
            });
          }

  // Remove maxWidth to prevent PDF.js from doing its own text wrapping
          pdf.text(
            textToWrite,
            x,
            pageHeight - margins - 0.2,
            {
              align: 'left',
              angle: 90
            }
            );
        });

        console.log('Saving PDF...');
pdf.save(`${formattedFilename}.pdf`);
        console.log('PDF saved!');

        document.body.removeChild(container);
        canvas.remove();
        resolve();
      } catch (error) {
        console.error('Error in image processing:', error);
        document.body.removeChild(container);
        canvas.remove();
      }
    };
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      document.body.removeChild(container);
      canvas.remove();
    };
    img.src = svgDataUrl;
  });
    } catch (error) {
      console.error('Error in PDF creation:', error);
    }
  };

  // Add this with your other functions near the top of your component
  const handleEditModeToggle = () => {
    setEditMode(!editMode);
    setHoveredId(null);  // Clear hoveredId when toggling edit mode
  };

  // Add this helper function at the top level of your component
  const toggleScrollLock = (lock) => {
    if (lock) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  };

  // First, add a new state for tracking hover between items
  const [hoverInsertIndex, setHoverInsertIndex] = useState(null);

  // Add a function to handle inserting at an index
  const handleInsertAt = (index) => {
    const allPoints = getAllPoints();
    const newX = (allPoints[index].x + (index > 0 ? allPoints[index - 1].x : 0)) / 2;

    const newPoint = {
      x: newX,
      y: 50,
      text: '',
      id: Date.now()
    };

  // Insert the new point
    const newPoints = [...points];
    newPoints.splice(index, 0, newPoint);
  // Update x positions
    newPoints.forEach((point, i) => {
      point.x = (i + 1) * G;
    });
    setPoints(newPoints);
  };


  // Refs for DOM elements
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const drawingRef = useRef(null);

  const getAllPoints = () => {
    return points;
  };

  const getNextX = () => {
    const allPoints = getAllPoints();
    // If no points yet, return just G for the first line
    return allPoints.length < 1 ? G : allPoints[allPoints.length - 1].x + G;
  };

  const getGridExtent = () => {
    const allPoints = getAllPoints();
    // This should be based only on existing points
    return allPoints.length < 1 ? G : allPoints[allPoints.length - 1].x;
  };

  const scrollToPoint = x => {
    if (!scrollRef.current) return;
    requestAnimationFrame(() => {
      let pos;
      if (rotated) {
        pos = x + (scrollRef.current.clientHeight / 2);
      } else {
      pos = x + (scrollRef.current.clientWidth / 2);  // Changed minus to plus
    }
    
    scrollRef.current.scrollTo({
      [rotated ? 'top' : 'left']: pos,
      behavior: 'smooth'
    });
  });
  };

  const toPercent = (pos, total) => total ? Math.max(0, Math.min(100, (pos/total) * 100)) : 50;
  
  const fromPercent = (pct, total) => total ? Math.max(0, Math.min(total, (pct/100) * total)) : 0;

  const getMousePos = e => {
    if (!drawingRef.current) return { x: 0, y: 50 };
    const rect = drawingRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      x: toPercent(x, rect.width),
    y: toPercent(y, rect.height)  // Use actual height directly now
  };
};


// First, update the handleReorder function to handle both regular and ghost points
const handleReorder = (from, to) => {
  if (from === to) return;

  let newPoints = [...points];
  // Remove the dragged point and insert it at the new position
  const [movedPoint] = newPoints.splice(from, 1);
  newPoints.splice(to, 0, movedPoint);

  // Recalculate x positions and ensure points are connected in sequential order
  newPoints = newPoints.map((point, index) => ({
    ...point,
    x: (index + 1) * G,  // Keep the x-coordinates in order
    // Each point should connect to the previous point
    connectsTo: index > 0 ? newPoints[index - 1].id : undefined
  }));

  setPoints(newPoints);
  setPreviewPositions([]);
};

const handleMouseMove = e => {
  if (!drawingRef.current) return;
  const pos = getMousePos(e);
  if (dragging && draggedPoint) {
    const y = rotated ? 100-pos.x : pos.y;
    setDraggedPoint(prev => ({...prev, z: y}));
  } else if (!dragging) {
    setCursor(rotated ? {x: pos.x, y: pos.x} : {x: pos.x, y: pos.y});
  }
};

const handleClick = e => {
  console.log('Click event:', {
    editMode,
    dragging,
    hoveredId,
    justDropped,
    target: e.target.closest('.drawing-area')
  });

  if (!drawingRef.current || dragging || hoveredId || justDropped || 
    !e.target.closest('.drawing-area')) {
    console.log('Click blocked by:', {
      noDrawingRef: !drawingRef.current,
      dragging,
      hoveredId,
      justDropped,
      noDrawingArea: !e.target.closest('.drawing-area')
    });
  return;
}

const pos = getMousePos(e);
const x = getNextX();
const rawY = rotated ? 100-pos.x : pos.y;

console.log('Position calculations:', {
  pos,
  x,
  rawY,
  mouseX: fromPercent(pos.x, drawingRef.current.getBoundingClientRect().width),
  nextX: getNextX()
});

  // Calculate if we're near enough to create a dot
const mouseX = fromPercent(pos.x, drawingRef.current.getBoundingClientRect().width);
const isNearGridLine = rotated
    ? Math.abs(mouseX - (75 * Math.round(mouseX / 75))) < G/2  // Check if near any grid line
    : Math.abs(mouseX - x) < G/2;  // Keep horizontal the same

    console.log('Grid line check:', {
      mouseX,
      isNearGridLine,
      rotated
    });

    if (!isNearGridLine) {
      console.log('Click not near grid line');
      return;
    }

    const y = findClosestPoint(rawY);

  // Calculate new width before point is added
    const newWidth = ((points.length + 1 + ghostPoints.length + 4) * G);

    if (!rotated && containerRef.current) {
      containerRef.current.style.width = `${newWidth}px`;
    }

    setPoints(s => [...s, {x, y, isAbove: y < 50, text: '', id: Date.now()}]);
    setUndoStack([]);
    scrollToPoint(x);
  };

  const handleExport = () => {
    const allPoints = getAllPoints();
  const totalWidth = (allPoints.length + 1) * G;  // Total width needed
  
  // Calculate available space (in inches converted to pixels)
  const availableWidth = 10 * 96;  // 10 inches * 96dpi
  const availableHeight = 7.5 * 96;  // 7.5 inches * 96dpi
  
  // Calculate scale to fit content, but never scale up
  const scale = Math.min(
    availableWidth / totalWidth,
    availableHeight / 600,  // Your standard height
    1  // Add this to prevent scale up
    );

  // Create scaled SVG of our current view
  const svgContent = `
  <svg 
    width="${totalWidth * scale}px"
    height="${600 * scale}px" 
    viewBox="0 0 ${totalWidth} 600"
    style="background-color: white;"
    preserveAspectRatio="xMidYMid meet"
    shape-rendering="geometricPrecision"
  >
    <!-- Grid Pattern -->
    <defs>
      <pattern id="print-grid" width="${G}" height="100%" patternUnits="userSpaceOnUse">
    ${HASH_POINTS.map((hp, i) => `
          <line 
            x1="-6" y1="${hp}%" 
            x2="6" y2="${hp}%" 
            stroke="grey"
          />
      `).join('')}
        <line x1="${G}" y1="0" x2="${G}" y2="100%" stroke="grey"/>
      </pattern>
    </defs>
    <!-- Solid start line -->
    <line x1="0" y1="0" x2="0" y2="100%" stroke="grey"/>

    <!-- Add emojis -->
    <text x="24" y="10%" text-anchor="middle" alignment-baseline="middle" font-size="32">🙂</text>
    <text x="24" y="90%" text-anchor="middle" alignment-baseline="middle" font-size="32">☹️</text>

    <!-- First grid line with dot -->
    <line x1="${G}" y1="0" x2="${G}" y2="100%" stroke="#ADADAD"/>
    <!-- Pattern rect starts after solid line -->
    <rect x="${G}" width="${totalWidth - G}" height="100%" fill="url(#print-grid)"/>
    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="grey"/>
    
    <!-- Rest of your SVG content -->

      <!-- Lines -->
    ${allPoints.map((point, i) => i > 0 ? `
        <line 
          x1="${allPoints[i-1].x}" 
          y1="${allPoints[i-1].y}%" 
          x2="${point.x}" 
          y2="${point.y}%" 
          stroke="black" 
          stroke-width="5"
        />
      ` : '').join('')}

      <!-- Points -->
    ${allPoints.map(point => `
        <circle 
          cx="${point.x}" 
          cy="${point.y}%" 
          r="${P}" 
          fill="black"
        />
      `).join('')}

      <line 
        x1="${totalWidth}" 
        y1="0" 
        x2="${totalWidth}" 
        y2="100%" 
        stroke="white" 
        stroke-width="2"
      />
    </svg>
  `;

// Create description layout
  const descriptionsContent = `
  <div style="
    position: absolute; 
    bottom: 0;
    width: 100%; 
    height: auto;
  ">
    ${allPoints.map((point, i) => {
      const fontSize = Math.max(12, 16 * scale);
      const textLength = point.text.length * fontSize;
      const boxWidth = 60; // Width of our text box
      
      // In your existing handleExport function, just modify the div style in descriptionsContent:

      return `
      <div style="
        position: absolute; 
        left: ${(point.x * scale) - ((boxWidth/2) * (scale/0.985) * (.75/scale))}px;
        width: ${boxWidth}px;
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        transform-origin: bottom center;
        text-orientation: mixed;
        direction: ltr;
        white-space: pre-line;
        max-height: 350px;
        overflow: hidden;
        font-size: ${fontSize}px;
        bottom: 0;
        height: 300px;
        text-align: right;
        text-indent: 0;
        border: none; // <-- Red border
        padding-left: 0;
        padding-right: 0;
        padding-bottom: ${fontSize * scale * 2}px;  
        margin-left: 0;
        margin-right: 0;
        box-sizing: border-box;
      ">
        ${point.text || ''}
      </div>
      `;
      }).join('')}
  </div>
    `;

    const printWindow = window.open('', '', 'width=960,height=672');

    const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          @media print {
            @page {
              size: landscape letter;
              margin: 0.5in;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            html, body {
              width: 11in !important;
              height: 8.5in !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }

            div {
              page-break-inside: avoid;
            }
          }

          @media screen and (max-width: 425px) {
            @page {
              margin: 0.5in !important;
              size: landscape letter !important;
            }
          }
        </style>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="chrome" content="noPrintingHeaderFooter">
        <meta name="PrintCSS" content="landscape">
        <meta name="apple-mobile-web-app-capable" content="yes">
      </head>
      <body>
<div style="
  max-width: 11in;
  margin: 0 auto;
  height: 8.5in;
  display: flex;
  flex-direction: column;
  position: relative;
  align-items: center;
  transform-origin: top center;
  @media print {
    transform: none !important;
    zoom: ${scale} !important;
  }
">
          <h1 style="text-align: center; margin: 0.25in 0 0.2in 0; font-family: Arial, sans-serif;">
            ${filename}
          </h1>
            <div style="
            text-align: center;
            margin: 0 0 0.375in 0;
            font-family: Arial, sans-serif;
            color: #000;
            font-size: 14px;
          ">
            ${allPoints.length} events
          </div>
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            transform-origin: top center;
            margin: 0 auto;  // Add this
          ">
            ${svgContent}
            ${descriptionsContent}
          </div>
        </div>
      </body>
    </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handlePointDrag = (i, isGhost) => e => {
    e.stopPropagation();
    const allPoints = getAllPoints();
    const point = allPoints[i];

  // Don't prevent default on mobile to allow scrolling
    if (!isMobile) {
      e.preventDefault();
    }

    setDraggedPoint({
      i,
      k: point.isGhost,
      y: point.y,
      z: point.y,
      id: point.id
    });
    setDragging(true);
  };

  useEffect(() => {
    if (drawingRef.current) {
      const rect = drawingRef.current.getBoundingClientRect();
      setCursor(rotated ? {x: cursor.y, y: cursor.y} : {x: cursor.x, y: cursor.x});
    }
  }, [rotated]);

  useEffect(() => {
    if (modalOpen && textareaRef.current) {
    // Original focus and cursor position logic
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;

    // Fix the layout
      document.body.style.height = '100vh';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
    // Reset the body styles when modal closes
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  }, [modalOpen]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (dragging && draggedPoint && drawingRef.current) {
        console.log('Before update - draggedPoint:', draggedPoint);
        console.log('Before update - all points:', points);

        const allPoints = getAllPoints();
        const point = allPoints[draggedPoint.i];
        const finalY = findClosestPoint(draggedPoint.z);

        console.log('Point to update:', point);
        console.log('Final Y position:', finalY);

      if (point) {  // Add null check here
        if (point.isGhost) {
          setPoints(s => [...s, {...point, y: finalY, isAbove: finalY < 50, isGhost: false, id: point.id}]);
          setGhostPoints(s => s.filter(p => p.id !== point.id));
          setUndoStack([]);
        } else {
          setPoints(s => s.map(p => 
            p.id === point.id ? {...p, y: finalY, isAbove: finalY < 50} : p
            ));
        }
      }
      
      setJustDropped(true);
      setTimeout(() => setJustDropped(false), 100);
    }
    setDragging(false);
    setDraggedPoint(null);
  };

  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('touchend', handleMouseUp);
  
  return () => {
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchend', handleMouseUp);
  };
}, [dragging, draggedPoint, rotated, points, ghostPoints]);

// Also add cleanup in case component unmounts during drag
  useEffect(() => {
    return () => {
    toggleScrollLock(false);  // Ensure scroll is unlocked when component unmounts
  };
}, []);

  const addGhostPoint = () => {
    const x = getNextX();

  // Create a real point (like mobile does)
    setPoints(s => [...s, {
      x,
      y: 50,
      text: '',
      id: Date.now()
    }]);

    scrollToPoint(x);
  };

  const handleTextInput = (index, text, isGhost) => {
    const point = getAllPoints()[index];
    if (isGhost) {
      setGhostPoints(s => s.map(p => 
        p.id === point.id ? {...p, text} : p
        ));
    } else {
      setPoints(s => s.map(p => 
        p.id === point.id ? {...p, text} : p
        ));
    }
  };

  const handleInputClick = (point, i) => {
    setEditingPoint({point, index: i});
    setEditText(point.text);
    setModalOpen(true);
  };

  // Update the touch handlers
  const handleTouchStart = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const allPoints = getAllPoints();
    const point = allPoints[index];
    
    console.log('📱 Touch Start:', { index, text: point.text });
    
    setDraggedDescriptionIndex(index);
    setDraggedItemId(point.id);
    setOriginalPoints([...allPoints]);
    setOriginalIndex(index);
    
    if (isMobile) {
      toggleScrollLock(true);
    }
  };


  const handleTouchMove = (e) => {
    if (editMode) return;
    setTouchMoved(true);

    if (dragging && draggedPoint) {
      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      const rect = drawingRef.current.getBoundingClientRect();
      const y = ((touch.clientY - rect.top) / rect.height) * 100;

      setDraggedPoint(prev => ({...prev, z: y}));
    }
  };

  const handleTouchEnd = () => {
    console.log('📱 Touch End:', {
      fromIndex: originalIndex,
      toIndex: draggedOverIndex
    });

    if (originalIndex !== null && draggedOverIndex !== null) {
      handleReorder(originalIndex, draggedOverIndex);
    }

    setDraggedDescriptionIndex(null);
    setDraggedOverIndex(null);
    setDraggedItemId(null);
    setPreviewPositions([]);
    setLastUpdateTime(0);
    setOriginalPoints(null);
    setOriginalIndex(null);

    if (isMobile) {
      toggleScrollLock(false);
    }
  };

// Score calculation function
  const calculateScores = (points) => {
    let runningScores = points.map(point => {
      console.log('Raw y-value:', point.y);
    // Divide by 5 to convert y-units to hash marks
      const distanceFromCenter = point.y > 50 ? 
      -Math.round((point.y - 50) / 5) : 
      Math.round((50 - point.y) / 5);
      console.log('Calculated hash distance:', distanceFromCenter);
      return distanceFromCenter;
    });

    let cumulativeScores = [];
    let total = 0;
    runningScores.forEach(score => {
      total += score;
      cumulativeScores.push(total);
    });

    return {
      individual: runningScores,
      cumulative: cumulativeScores,
      total: total
    };
  };

  const renderSVG = (isVertical) => {
    const allPoints = getAllPoints();
    const rect = drawingRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const width = rect.width;
    const height = rect.height;
    const getPos = (point, i) => {
      const y = isVertical ? 100-point.y : point.y;
      let displayY = draggedPoint?.i === i ? draggedPoint.z : point.y;
      const yPos = fromPercent(isVertical ? 100-displayY : displayY, isVertical ? rect.width : rect.height);
      return {
        x: isVertical ? yPos : point.x,
        y: isVertical ? point.x : yPos
      };
    };

    const previewY = rotated ? 100-cursor.x : cursor.y;
    const snappedY = findClosestPoint(previewY);
    const previewPos = {
      x: isVertical 
      ? fromPercent(isVertical ? 100-snappedY : snappedY, rect.width) 
      : getNextX(),
      y: isVertical 
      ? getNextX()
      : fromPercent(snappedY, rect.height)  // Use actual height
    };

    const nextX = getNextX();
    const mouseX = fromPercent(cursor.x, rect.width);

    const isNearNextLine = rotated
      ? Math.abs(mouseX - (75 * Math.round(mouseX / 75))) < G/2  // Check if near any grid line
      : Math.abs(mouseX - nextX) < G/2;  // Keep horizontal the same

      // Debug log
      if (rotated) {
        console.log('Position check:', {
          mouseX,
          nearestGridLine: 75 * Math.round(mouseX / 75),
          nextX,
          isNear: Math.abs(mouseX - (75 * Math.round(mouseX / 75))) < G/2
        });
      }

      return (
        <svg 
        className="absolute top-0 left-0 w-full h-full" 
        style={{pointerEvents: 'none'}}
        viewBox={`0 0 ${width} ${rotated ? height : (isMobile ? rect.height : rect.height)}`}
        preserveAspectRatio={isMobile ? "none" : "xMidYMid meet"}
        >
        <defs>
        <pattern 
        id={isVertical ? "gv" : "g"}
        width={isVertical ? "100%" : G}
        height={isVertical ? G : "100%"}
        patternUnits="userSpaceOnUse"
        >
        {HASH_POINTS.map((hp, i) => 
          isVertical ? (
            <line 
            key={i}
            x1={`${hp}%`} y1="-6"
            x2={`${hp}%`} y2="6"
            stroke="#ddd"
            strokeWidth="1"
            />
            ) : (
            <line
            key={i}
            x1="-6" y1={`${hp}%`}
            x2="6" y2={`${hp}%`}
            stroke="#ddd"
            strokeWidth="1"
            />
            )
            )}
        <line 
        x1={isVertical ? "0" : G}
        y1={isVertical ? G : "0"}
        x2={isVertical ? "100%" : G}
        y2={isVertical ? G : "100%"}
        stroke="#ddd"
        />
        </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${isVertical ? 'gv' : 'g'})`}/>
        <line
        x1={isVertical ? "50%" : "0"}
        y1={isVertical ? "0" : "50%"}
        x2={isVertical ? "50%" : "100%"}
        y2={isVertical ? "100%" : "50%"}
        stroke="black"
        />
        <text 
        x={isVertical ? "90%" : "32"} 
        y={isVertical ? "32" : "10%"} 
        textAnchor="middle" 
        alignmentBaseline="middle" 
        fontSize="32"
        >
        🙂
        </text>
        <text 
        x={isVertical ? "10%" : "32"} 
        y={isVertical ? "32" : "90%"} 
        textAnchor="middle" 
        alignmentBaseline="middle" 
        fontSize="32"
        >
        ☹️
        </text>
        {!dragging && !hoveredId && isNearNextLine && !isMobile && (
          <circle
          cx={previewPos.x}
          cy={previewPos.y}
          r={P}
          fill="gray"
          opacity="0.5"
          />
          )}

        {/* Cumulative Line */}
        {cumulativeType === 'line' && allPoints.length > 0 && (() => {
          const scores = calculateScores(allPoints);

          let segments = [];
          let currentSegment = { points: [], isPositive: scores.cumulative[0] >= 0 };

          scores.cumulative.forEach((score, i) => {
          // NEW: Calculate position based on orientation
            let x, y;
            if (isVertical) {
            // Vertical view: x is score-based, y is grid-based
              x = fromPercent(50, rect.width) + (score * 5);
              y = (i + 1) * G;
            } else {
            // Horizontal view: original calculation
              x = (i + 1) * G;
              y = fromPercent(50, rect.height) - (score * 5);
            }

            if (i > 0 && (score >= 0) !== currentSegment.isPositive) {
              const prevScore = scores.cumulative[i - 1];

            // NEW: Calculate previous point based on orientation
              let prevX, prevY;
              if (isVertical) {
                prevX = fromPercent(50, rect.width) + (prevScore * 5);
                prevY = i * G;
              } else {
                prevX = i * G;
                prevY = fromPercent(50, rect.height) - (prevScore * 5);
              }

              const ratio = Math.abs(prevScore) / (Math.abs(prevScore) + Math.abs(score));

            // NEW: Calculate crossing point based on orientation
              let crossingX, crossingY;
              if (isVertical) {
                crossingX = fromPercent(50, rect.width);
                crossingY = prevY + (y - prevY) * ratio;
              } else {
                crossingX = prevX + (x - prevX) * ratio;
                crossingY = fromPercent(50, rect.height);
              }

              currentSegment.points.push({ x: crossingX, y: crossingY });
              segments.push(currentSegment);

              currentSegment = {
                points: [{ x: crossingX, y: crossingY }, { x, y }],
                isPositive: score >= 0
              };
            } else {
              currentSegment.points.push({ x, y });
            }
          });
          segments.push(currentSegment);

        // The rest of your code remains exactly the same
          return (
            <>
            {segments.map((segment, i) => {
              const points = segment.points;
              let d = `M ${points[0].x} ${points[0].y}`;
              
              for (let i = 1; i < points.length; i++) {
                d += ` S ${points[i].x} ${points[i].y} ${points[i].x} ${points[i].y}`;
              }

              return (
                <path
                key={`segment-${i}`}
                d={d}
                stroke={editMode ? 
                    (segment.isPositive ? "rgba(52, 211, 153, 0.3)" : "rgba(248, 113, 113, 0.3)") : // Faded in edit mode
                    (segment.isPositive ? "rgba(52, 211, 153, 1)" : "rgba(248, 113, 113, 1)")}      // Normal colors
                    strokeWidth="2"
                    fill="none"
                    style={{
                      transition: 'stroke 0.2s ease'
                    }}
                    />
                    );
            })}
            </>
            );
        })()}

        {/* Score Bars */}
        {cumulativeType === 'bars' && allPoints.length > 0 && (() => {
          const scores = calculateScores(allPoints);
          return scores.cumulative.map((score, i) => {
            const barHeight = Math.abs(score * 5);

            if (isVertical) {
              const x = score >= 0 ? 
              fromPercent(50, rect.width) : 
              fromPercent(50, rect.width) - barHeight;
              return (
                <rect
                key={`bar-${i}`}
                x={x}
                y={(i + 1) * G - (G * 0.4)}
                height={G * 0.8}
                width={barHeight}
                fill={editMode ?
                (score >= 0 ? "rgba(52, 211, 153, 0.3)" : "rgba(248, 113, 113, 0.3)") :
                (score >= 0 ? "rgba(52, 211, 153, 0.4)" : "rgba(248, 113, 113, 0.4)")}
                rx={2}
                style={{
                  transition: 'fill 0.2s ease'
                }}
                />
                );
            } else {
              const y = score >= 0 ? 
              fromPercent(50, rect.height) - barHeight : 
              fromPercent(50, rect.height);
              return (
                <rect
                key={`bar-${i}`}
                x={(i + 1) * G - (G * 0.4)}
                y={y}
                width={G * 0.8}
                height={barHeight}
                fill={editMode ?
                (score >= 0 ? "rgba(52, 211, 153, 0.3)" : "rgba(248, 113, 113, 0.3)") :
                (score >= 0 ? "rgba(52, 211, 153, 0.4)" : "rgba(248, 113, 113, 0.4)")}
                rx={2}
                style={{
                  transition: 'fill 0.2s ease'
                }}
                />
                );
            }
          });
        })()}

        {/* Connecting lines */}
        {showPoints && (() => {
        // Use preview positions during drag, otherwise use regular points
          const pointsToRender = previewPositions.length > 0 ? previewPositions : points;

          console.log('🔗 Drawing Lines for Points (Final Order):', pointsToRender.map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            connectsTo: p.connectsTo
          })));

          return pointsToRender.map((point, i) => {
            if (i === 0) return null; // Skip first point since it has no previous connection

            const prevPoint = pointsToRender[i - 1]; // Get previous point from the same array we're rendering

            return (
              <line
              key={`l${point.id}`}
              x1={getPos(prevPoint, i - 1).x}
              y1={getPos(prevPoint, i - 1).y}
              x2={getPos(point, i).x}
              y2={getPos(point, i).y}
              stroke="black"
              strokeWidth="2"
              style={{
                transition: previewPositions.length > 0 ? 'all 0.2s ease' : 'none'
              }}
              />
              );
          });
        })()}

      {/* Points */}
        {showPoints && (previewPositions.length > 0 ? previewPositions : allPoints).map((point, i) => {
          const pos = getPos(point, i);
          const isHovered = hoveredId === point.id;
          const isBeingDragged = point.id === draggedItemId;
        // Only enlarge the specific point being touched
          const shouldEnlarge = (isMobile ? 
            (point.id === touchedPointId || tappedPoint?.point.id === point.id) : 
            (isHovered || isBeingDragged || point.id === touchedPointId || selectedPoint?.point.id === point.id)
            );        
          console.log('Enlarge conditions:', {
            isHovered,
            isBeingDragged,
            touchedPointId,
            selectedPointId: selectedPoint?.point.id,
            pointId: point.id
          });

          return (
            <g
            key={point.id}
            style={{
              pointerEvents: 'all',
              cursor: editMode ? 'pointer' : dragging ? 'grabbing' : 'grab',
              transition: previewPositions.length > 0 ? 'transform 0.2s ease' : 'none'
            }}
            onMouseEnter={() => !isMobile && setHoveredId(point.id)}
            onMouseLeave={() => !isMobile && setHoveredId(null)}
            onMouseDown={editMode ? undefined : handlePointDrag(i, point.isGhost)}
            onDoubleClick={editMode ? () => {
              const newPoints = points.filter((_, index) => index !== i);
              newPoints.forEach((point, index) => {
                point.x = (index + 1) * G;
              });
              setPoints(newPoints);
            } : undefined}
            onTouchStart={(e) => {
              if (editMode) return;
              e.stopPropagation();

              setTouchStartTime(Date.now());
              setTouchMoved(false);

              // Immediately initiate drag on touch start for mobile
              if (isMobile) {
                handlePointDrag(i, point.isGhost)(e);
              }

              setTouchedPointId(point.id);
            }}

            onTouchMove={(e) => {
              if (editMode || !dragging) return;
              e.preventDefault();
              e.stopPropagation();

              const touch = e.touches[0];
              const rect = drawingRef.current.getBoundingClientRect();
              const y = ((touch.clientY - rect.top) / rect.height) * 100;

            // Update the draggedPoint position
              setDraggedPoint(prev => prev ? {...prev, z: y} : null);
              setTouchMoved(true);
            }}

            onTouchEnd={(e) => {
              // Check if this was a quick tap (less than 200ms)
              const touchDuration = Date.now() - touchStartTime;
              console.log('Touch end:', {
                duration: touchDuration,
                moved: touchMoved,
                dragging,
                point: point
              });
              
              if (touchDuration < 200 && !touchMoved) {
                console.log('Toggle tapped point');
                setTappedPoint(current => 
                  // If tapping the same point, clear it. Otherwise, set new point
                  current?.point?.id === point.id ? null : {
                    index: i + 1,
                    point: point
                  }
                  );
              } else {
                setTappedPoint(null);
              }

              // Always clear states
              setTouchedPointId(null);
              setSelectedPoint(null);
              setTouchStartTime(null);
              setTouchMoved(false);
              
              // Handle drag end logic
              if (dragging && draggedPoint) {
                const finalY = findClosestPoint(draggedPoint.z);
                
                if (point.isGhost) {
                  setPoints(s => [...s, {...point, y: finalY, isAbove: finalY < 50, isGhost: false, id: point.id}]);
                  setGhostPoints(s => s.filter(p => p.id !== point.id));
                  setUndoStack([]);
                } else {
                  setPoints(s => s.map(p => 
                    p.id === point.id ? {...p, y: finalY, isAbove: finalY < 50} : p
                    ));
                }
                
                setJustDropped(true);
                setTimeout(() => setJustDropped(false), 100);
              }
              setDragging(false);
              setDraggedPoint(null);
            }}
            >
            <circle
            cx={pos.x}
            cy={pos.y}
            r={D}
            fill="transparent"
            />
            <circle
            cx={pos.x}
            cy={pos.y}
            r={P * (shouldEnlarge ? 2 : 1)}
            fill={isMobile ? "black" : (isBeingDragged ? "#FCD34D" : point.isGhost ? "gray" : "black")}
            style={{
              transition: 'r 0.2s ease, fill 0.2s ease'
            }}
            />
            {/* Added info popup for mobile */}
            {console.log('Popup render check:', {
              isMobile,
              tappedPoint,
              pointId: point.id,
              tappedPointId: tappedPoint?.point?.id
            })}
            
            {/* Your existing edit mode delete button */}
            {editMode && (
              <g 
                transform={`translate(${pos.x}, ${pos.y - 20})`}
                onClick={(e) => {
                  e.stopPropagation();
                  const newPoints = points.filter((_, index) => index !== i);
                  newPoints.forEach((point, index) => {
                    point.x = (index + 1) * G;
                  });
                  setPoints(newPoints);
                  }}
                  >
                  <circle r="8" fill="white" stroke="#ef4444" strokeWidth="1" />
                  <text 
                  fill="#ef4444" 
                  fontSize="12" 
                  textAnchor="middle" 
                  dy=".3em"
                  >×</text>
                  </g>
                  )}
                </g>
                );
              })}

        {/* Popup - moved outside and after points */}
        {showPoints && (previewPositions.length > 0 ? previewPositions : allPoints).map((point, i) => {
          const pos = getPos(point, i);
          return isMobile && tappedPoint && (point.id === tappedPoint.point.id) && (
            <g style={{ pointerEvents: 'none' }}>
              <rect
              x={pos.x + 20}
              y={pos.y - 40}
              width="120"
              height="60"
              rx="4"
              fill="white"
              stroke="#ddd"
              filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.1))"
              />
              <text
              x={pos.x + 30}
              y={pos.y - 20}
              fontSize="12"
              fill="black"
              >
              Point {i + 1}
              </text>
              <text
              x={pos.x + 30}
              y={pos.y}
              fontSize="12"
              fill="gray"
              >
              {(point.text || 'No description').length > 18 
              ? `${(point.text || 'No description').substring(0, 18)}...`
              : (point.text || 'No description')}
              </text>
            </g>
            ); 
        })}

        {/* Digital cutout mask */}
{(showDigitalCutout || showAnalyticsCutout) && (
  <g>
    <defs>
      <mask id="cutoutMask">
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
        {allPoints.map((point, i) => {
          // Check which points to use based on which toggle is on
          if (!(showDigitalCutout ? digitalPoints.has(point.id) : bluePoints.has(point.id))) return null;
          
          const pos = getPos(point, i);
          return (
            <g key={`hole-${point.id}`}>
              {isVertical ? (
                <>
                  <rect
                    x="0"
                    y={pos.y - G/2}
                    width="100%"
                    height={G}
                    fill="black"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={P * 2}
                    fill="black"
                  />
                </>
              ) : (
                <>
                  <rect
                    x={pos.x - G/2}
                    y="0"
                    width={G}
                    height="100%"
                    fill="black"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={P * 2}
                    fill="black"
                  />
                </>
              )}
            </g>
          );
        })}
      </mask>
    </defs>

    {/* Overlay with appropriate color based on which toggle is on */}
    <rect
      x="0"
      y="0"
      width="100%"
      height="100%"
      fill={showDigitalCutout ? "#FCD34D" : "#3B82F6"}
      mask="url(#cutoutMask)"
    />
  </g>
)}
    </svg>
  );
};

  // Update the return JSX to use our state
return (
  <div style={{
    width: '100vw',
    height: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    // position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }}>

  <style>{`
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 24px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .2s;
    border-radius: 24px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: .2s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: #2196F3;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(16px);
  }
  `}</style>

  <style>{`
      @keyframes m{0%{background-position:0 0}100%{background-position:20px 0}}
      @keyframes v{0%{background-position:0 0}100%{background-position:0 20px}}
      .r{writing-mode:vertical-rl;transform:rotate(180deg)}
  `}</style>

  {/* Outer white container */}
  <div style={{
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'center',
    width: '100%'
  }}>

  {/* Main content container */}
  <div style={{
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '1900px'
  }}>

  {/* Single flex container for all items */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%'
  }}>

          {/* Rotation buttons */}
          <Button 
            size="sm"
            variant="outline"
            style={{ width: '9.5rem' }}
            onClick={() => setRotated(false)}
            disabled={!rotated}
            >
            {isMobile ? 'Show Chart' : 'Rotate Left'}
          </Button>

          <Button 
            size="sm" 
            variant="outline" 
            style={{ width: '9.5rem' }}
            onClick={() => setRotated(true)}
            disabled={rotated}
            >
            {isMobile ? 'Show Descriptions' : 'Rotate Right'}
          </Button>         

          {/* Document name input */}
          <Input 
            type="text"
            value={filename}
            onChange={(e) => {
              // Only update the base drawing name
              setFilename(e.target.value);
            }}
            placeholder="Drawing Name"
            style={{
              minWidth: '200px',
              maxWidth: '14rem',
              width: '100%',
              textAlign: 'center',
              fontSize: '1rem',
              fontWeight: 600,
              height: '2.25rem',
              padding: '0.25rem'
            }}
          />

          {/* Action buttons */}
            <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              console.log('Export button clicked');
              handlePdfExport();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
            <Save style={{ width: '1rem', height: '1rem' }}/>Export PDF
            </Button>

            <Button 
            onClick={() => {
              if (points.length < 1) return;
              const lastPoint = points[points.length - 1];
              setPoints(s => s.slice(0, -1));
              setUndoStack(s => [...s, lastPoint]);
            }}
            disabled={points.length === 0}
            size="sm" 
            variant="outline" 
            style={{ width: '6rem' }}
            >
            Undo Dot
            </Button>

            <Button 
            onClick={() => {
              if (undoStack.length < 1) return;
              const lastPoint = undoStack[undoStack.length - 1];
              setUndoStack(s => s.slice(0, -1));
              setPoints(s => [...s, lastPoint]);
            }}
            disabled={undoStack.length === 0}
            size="sm" 
            variant="outline" 
            style={{ width: '6rem' }}
            >
            Redo Dot
            </Button>

            {/* Edit Mode Toggle */}
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={editMode}
                onChange={handleEditModeToggle}
              />
              <span className="toggle-slider"></span>
            </label>
            <span style={{ fontSize: '14px' }}>Edit Points</span>

            {/* Cutout Dropdown */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginLeft: '0rem'
            }}>
            <label style={{fontSize: '14px'}}>
              Color Cutout:
              <select 
                value={cutoutType}
                onChange={(e) => {
                  const value = e.target.value;
                  setCutoutType(value);
                  setShowDigitalCutout(value === 'yellow');
                  setShowAnalyticsCutout(value === 'blue');
                }}
                style={{
                  marginLeft: '0.5rem',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #e2e8f0'
                }}
              >
                <option value="none">None</option>
                <option value="yellow">Yellow</option>
                <option value="blue">Blue</option>
              </select>
            </label>
          </div>


            {/* Points Control */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'left',
              borderRight: '',  // Subtle divider
              paddingRight: '', // Subtle padding
              }}>
              <label style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontSize: '14px'
                }}>
                <input
                type="checkbox"
                checked={showPoints}
                onChange={(e) => setShowPoints(e.target.checked)}
                />
                Show Points
              </label>
            </div>

            {/* Cumulative Control */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              }}>
              <label style={{fontSize: '14px'}}>
              Cumulative:
              <select 
              value={cumulativeType} 
              onChange={(e) => setCumulativeType(e.target.value)}
              style={{
                marginLeft: '0.5rem',
                padding: '0.25rem',
                borderRadius: '0.25rem',
                border: '1px solid #e2e8f0'
              }}
              >
              <option value="none">None</option>
              <option value="bars">Bar Chart</option>
              <option value="line">Line Graph</option>
              </select>
              </label>
            </div>
            
            {/* Dot count */}
            <span style={{ marginLeft: '0.5rem', fontSize: '14px', paddingTop: '' }}>
            {rotated ? (
            `${points.length} descriptions${ghostPoints.length > 0 ? `, ${ghostPoints.length} grey dots` : ''} ${cumulativeType !== 'none' ? ` • Cumulative Score: ${calculateScores(points).total}` : ''}`
              ) : (
            `${points.length} black dots${ghostPoints.length > 0 ? `, ${ghostPoints.length} grey dots` : ''} ${cumulativeType !== 'none' ? ` • Cumulative Score: ${calculateScores(points).total}` : ''}`
            )}
            </span>

  </div>

        </div>
      </div>
            
            {rotated ? (
            <div 
            ref={scrollRef}
            style={{
              position: 'relative',
              flex: 1,
              overflowY: 'auto',
              background: '#f9fafb',
              cursor: dragging ? 'ew-resize' : hoveredId ? 'ew-resize' : 'crosshair',
              height: 'calc(100dvh - 80px)'
            }}
            >
            <div 
            ref={containerRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              minHeight: '100%',
              display: 'flex',
              height: `${(points.length + ghostPoints.length + 4) * G}px`

            }}
            >
            <div style={{
              position: 'relative',
              background: 'white',
              borderRight: '1px solid #e2e8f0',
              flexShrink: 0,
              width: isMobile ? '100%' : `calc(100% - ${H})`  // Full width on mobile
            }}>
            <div style={{
              position: 'absolute',
              top: `${getNextX()}px`,
              left: isMobile ? '50%' : '70%',  // Use 50% on mobile, 70% otherwise on vertical
              transform: 'translate(-50%,-50%) rotate(90deg)',
              width: '2.5rem',
              height: '5rem', // Vertical Plus Button Width
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem'
            }}>
            <Button  
            size="sm"
            variant="ghost"
            onClick={addGhostPoint}
            style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: 0,
              transition: 'background-color 0.2s'
            }}
            className="hover:bg-gray-100"
            >
            <Plus className="w-4 h-4"/>
            </Button>
            </div>
{getAllPoints().map((point, i) => (
 <React.Fragment key={`group-${point.id}`}>
   {/* Insert hover zone before each point (except the first one) */}
   {i > 0 && !isMobile && (
     <div
     style={{
       position: 'absolute',
       left: rotated ? '50%' : `${point.x - G/2}px`,
       top: rotated ? `${point.x - G/2}px` : '50%',
       transform: 'translate(-50%, -50%)',
       width: rotated ? '100%' : '40px',
       height: rotated ? '40px' : '100%',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       opacity: hoveredId === point.id ? 1 : 0,  // Changed from hoverInsertIndex
       transition: 'opacity 0.2s',
       cursor: 'pointer',
       pointerEvents: draggedDescriptionIndex !== null ? 'none' : 'auto'
     }}
     onMouseEnter={() => !isMobile && setHoveredId(point.id)}
     onMouseLeave={() => !isMobile && setHoveredId(null)}
     onClick={() => handleInsertAt(i)}
     >
     <div
     style={{
       width: '24px',
       height: '24px',
       borderRadius: '50%',
       backgroundColor: '#fff',
       border: '2px solid #9ca3af',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
     }}
     >
     <Plus size={16} />
     </div>
     </div>
   )}

   <div
     key={point.id}
     data-description-index={i}
     onDragOver={(e) => {
       e.preventDefault();
       e.stopPropagation();
       const i = parseInt(e.currentTarget.getAttribute('data-description-index'));
       const currentTime = Date.now();

       if (currentTime - lastUpdateTime > DEBOUNCE_TIME) {
         if (originalIndex !== null && i !== draggedOverIndex) {
           let previewPoints = [...originalPoints];
           const [movedPoint] = previewPoints.splice(originalIndex, 1);
           previewPoints.splice(i, 0, movedPoint);

           // Update x positions and connections in preview
           previewPoints = previewPoints.map((point, index) => ({
             ...point,
             x: (index + 1) * G,
             connectsTo: index > 0 ? previewPoints[index - 1].id : undefined
           }));

           setLastUpdateTime(currentTime);
           setDraggedOverIndex(i);
           setPreviewPositions(previewPoints);
         }
       }
     }}
     onDragEnter={(e) => {
       e.preventDefault();
       if (draggedDescriptionIndex !== i) {
         setDraggedOverIndex(i);
       }
     }}
     onDragLeave={(e) => {
       e.preventDefault();
       if (draggedOverIndex === i) {
         setDraggedOverIndex(null);
       }
     }}
     style={{
       position: 'absolute',
       left: isMobile ? '50%' : '70%',  // Use 50% on mobile, 60% otherwise on vertical
       top: `${point.x}px`,
       transform: 'translate(-50%,-50%)',
       opacity: draggedDescriptionIndex === i ? 0.5 : 1,  // Fade the dragged item
       marginBottom: '25px',
       display: 'flex',
       flexDirection: 'row',
       alignItems: 'center',
       gap: '0.5rem',
       background: draggedOverIndex === i ? '#FFF9C4' : 'transparent',  // Highlight drop target
       padding: '0.5rem',
       borderRadius: '0.375rem',
       transition: 'all 0.2s ease',
       border: draggedOverIndex === i ? '2px dashed #FCD34D' : '2px solid transparent'  // Show drop zone
     }}
   >
     <div style={{
       display: 'flex',
       alignItems: 'center',
       flexDirection: 'row',
       gap: '0.5rem'
     }}>
       {/* SECTION 1: Color Dots */}
       <div style={{
         display: 'flex',
         flexDirection: 'row',
         gap: '0.5rem'
       }}>
         <div 
           onClick={() => {
             setDigitalPoints(prev => {
               const next = new Set(prev);
               if (next.has(point.id)) {
                 next.delete(point.id);
               } else {
                 next.add(point.id);
               }
               return next;
             });
           }}
           style={{
             width: '16px',
             height: '16px',
             borderRadius: '50%',
             border: '1px solid #666',
             backgroundColor: digitalPoints.has(point.id) ? '#FCD34D' : 'transparent',
             cursor: 'pointer',
             transition: 'background-color 0.2s'
           }}
         />
         <div 
           onClick={() => {
             setBluePoints(prev => {
               const next = new Set(prev);
               if (next.has(point.id)) {
                 next.delete(point.id);
               } else {
                 next.add(point.id);
               }
               return next;
             });
           }}
           style={{
             width: '16px',
             height: '16px',
             borderRadius: '50%',
             border: '1px solid #666',
             backgroundColor: bluePoints.has(point.id) ? '#3B82F6' : 'transparent',
             cursor: 'pointer',
             transition: 'background-color 0.2s'
           }}
         />
       </div>

       {/* SECTION 2: Description Input */}
       <Input
         type="text"
         value={point.text}
         readOnly
         onClick={() => handleInputClick(point, i)}
         onChange={e => handleTextInput(i, e.target.value, point.isGhost)}
         placeholder={`Description ${i + 1}`}
         style={{
           width: '200px',
           height: '2.5rem',
           border: '1px solid #e2e8f0',
           borderRadius: '0.375rem'
         }}
       />

       {/* SECTION 3: Drag Handle */}
       <div
         draggable
         onDragStart={(e) => {
           const currentPoints = getAllPoints();
           console.log('🟦 Drag Start:', { 
             index: i, 
             id: point.id,
             text: point.text,
             initialOrder: currentPoints.map(p => ({ id: p.id, x: p.x, text: p.text }))
           });

           e.dataTransfer.effectAllowed = 'move';
           setDraggedDescriptionIndex(i);
           setDraggedItemId(point.id);
           setOriginalPoints([...currentPoints]);  // Store initial order
           setOriginalIndex(i);
           document.body.classList.add('dragging');
         }}
         onDragEnd={() => {
           console.log('🟥 Drag End:', {
             fromIndex: originalIndex,
             toIndex: draggedOverIndex,
           });

           if (originalIndex !== null && draggedOverIndex !== null) {
             handleReorder(originalIndex, draggedOverIndex);
           }

           setDraggedDescriptionIndex(null);
           setDraggedOverIndex(null);
           setDraggedItemId(null);
           setPreviewPositions([]);
           setLastUpdateTime(0);
           setOriginalPoints(null);
           setOriginalIndex(null);
           document.body.classList.remove('dragging');
         }}
         onTouchStart={(e) => {
           e.stopPropagation();
           console.log('📱 Touch Start on description:', { index: i, text: point.text });

           // Show visual feedback immediately
           if (isMobile) {
             setDraggedDescriptionIndex(i);
             setDraggedItemId(point.id);
             setOriginalPoints([...points]);
             setOriginalIndex(i);
             toggleScrollLock(true);  // Prevent scrolling while dragging
           }
         }}
         onTouchMove={(e) => {
           if (!isMobile || !draggedItemId) return;
           e.preventDefault();
           e.stopPropagation();

           const touch = e.touches[0];
           const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
           const descriptionElement = elements.find(el => el.getAttribute('data-description-index'));
           
           if (descriptionElement) {
             const index = parseInt(descriptionElement.getAttribute('data-description-index'));
             const currentTime = Date.now();
             
             if (currentTime - lastUpdateTime > DEBOUNCE_TIME) {
               console.log('📱 Mobile drag:', { 
                 draggedItemId,
                 fromIndex: draggedDescriptionIndex, 
                 toIndex: index 
               });
               
               // Create preview
               const previewPoints = [...points];
               const [movedPoint] = previewPoints.splice(draggedDescriptionIndex, 1);
               previewPoints.splice(index, 0, movedPoint);
               
               setLastUpdateTime(currentTime);
               setDraggedOverIndex(index);
               setPreviewPositions(previewPoints);
             }
           }
         }}
         onTouchEnd={(e) => {
           if (!isMobile) return;
           
           console.log('📱 Touch End:', {
             fromIndex: originalIndex,
             toIndex: draggedOverIndex
           });
           
           if (originalIndex !== null && draggedOverIndex !== null) {
             handleReorder(originalIndex, draggedOverIndex);
           }
           
           // Clear all drag states
           setDraggedDescriptionIndex(null);
           setDraggedOverIndex(null);
           setDraggedItemId(null);
           setPreviewPositions([]);
           setLastUpdateTime(0);
           setOriginalPoints(null);
           setOriginalIndex(null);
           toggleScrollLock(false);
         }}
         style={{
           cursor: 'grab',
           padding: '0.25rem',
           color: '#666',
           transition: 'transform 0.2s, background-color 0.2s',
           transform: draggedDescriptionIndex === i ? 'scale(0.95)' : draggedOverIndex === i ? 'scale(1.05)' : 'scale(1)',
           backgroundColor: draggedDescriptionIndex === i ? '#FFF9C4' : draggedOverIndex === i ? '#f3f4f6' : 'transparent',
           borderRadius: '0.25rem'
         }}
       >
         <GripVertical size={16} />
       </div>
     </div>
   </div>
 </React.Fragment>
))}
</div>
<div 
  ref={drawingRef}
  style={{
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    display: isMobile ? 'none' : 'block'  // Hide on mobile
  }}
  className="drawing-area"
  onMouseMove={handleMouseMove}
  onClick={handleClick}
  >
  {renderSVG(true)}
  {!hoveredId && !dragging && !isMobile && <div style={{
    position: 'absolute',
    pointerEvents: 'none',
    left: `${cursor.x}%`,
    top: 0,
    width: '2px',
    height: '100%',
    backgroundImage: 'linear-gradient(to bottom, black 50%, transparent 50%)',
    backgroundSize: '2px 20px',
    backgroundRepeat: 'repeat-y',
    animation: 'v 1s linear infinite'
  }}/>}
  </div>
  </div>
  </div>
  ) : (
  <div 
  ref={scrollRef}
  style={{
    position: 'relative',
  ...(isMobile ? {} : { flex: 1 }),  // Only apply flex on desktop, omit it entirely for mobile
  overflowX: 'auto',
  background: '#f9fafb',
  cursor: dragging ? 'ns-resize' : hoveredId ? 'ns-resize' : 'crosshair',
  height: 'calc(100dvh - 80px)',  // Just one value since it's the same either way
  }}
>
  <div 
  ref={containerRef}
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    minWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    width: `${(points.length + ghostPoints.length + 4) * G}px`,
      minHeight: isMobile ? 'initial' : undefined  // Add this too
    }}
    >
    <div 
    ref={drawingRef}
    style={{
      position: 'relative',
      overflow: 'hidden',
        height: isMobile ? '100%' : H,  // Use full height on mobile
        minHeight: isMobile ? 'initial' : undefined,  // Add this to override any min-height
        touchAction: dragging ? 'none' : 'pan-x'  // Allow horizontal scroll unless dragging
      }}
      className="drawing-area"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      >
      {renderSVG(false)}
      {!hoveredId && !dragging && !isMobile && <div style={{
        position: 'absolute',
        pointerEvents: 'none',
        top: `${cursor.y}%`,
        left: 0,
        width: '100%',
        height: '1px',
        backgroundImage: 'linear-gradient(to right, black 50%, transparent 50%)',
        backgroundSize: '20px 1px',
        backgroundRepeat: 'repeat-x',
        animation: 'm 1s linear infinite'
      }}/>}
      </div>
      <div style={{
        position: 'relative',
        background: 'white',
        borderTop: '1px solid #e2e8f0',
        flexShrink: 0,
        height: `calc(100% - ${H})`,
      display: isMobile ? 'none' : 'block'  // Hide on mobile
    }}>
    <div style={{
      position: 'absolute',
      left: `${getNextX()}px`,
      top: '50%',
      transform: 'translate(-50%,-50%) rotate(-90deg)',
      width: '5rem', // Horizontal Plus Button Height
      height: '2.5rem',
      border: '1px solid #e2e8f0',
      borderRadius: '0.375rem'
    }}>
    <Button  
    size="sm"
    variant="ghost"
    onClick={addGhostPoint}
    style={{ 
      width: '100%', 
      height: '100%', 
      borderRadius: 0,
      transition: 'background-color 0.2s'
    }}
    className="hover:bg-gray-100"
    >
    <Plus className="w-4 h-4"/>
    </Button>
    </div>
    
{getAllPoints().map((point, i) => (
  <React.Fragment key={`group-${point.id}`}>
    {/* Insert hover zone before each point (except the first one) */}
    {i > 0 && !isMobile && (
      <div
        style={{
          position: 'absolute',
          left: rotated ? '50%' : `${point.x - G/2}px`,
          top: rotated ? `${point.x - G/2}px` : '50%',
          transform: 'translate(-50%, -50%)',
          width: rotated ? '100%' : '40px',
          height: rotated ? '40px' : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hoveredId === point.id ? 1 : 0,  // Changed from hoverInsertIndex
          transition: 'opacity 0.2s',
          cursor: 'pointer',
          pointerEvents: draggedDescriptionIndex !== null ? 'none' : 'auto'
        }}
        onMouseEnter={() => !isMobile && setHoveredId(point.id)}
        onMouseLeave={() => !isMobile && setHoveredId(null)}
        onClick={() => handleInsertAt(i)}
        >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            border: '2px solid #9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Plus size={16} />
        </div>
      </div>
      )}

      <div
        key={point.id}
        data-description-index={i}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const i = parseInt(e.currentTarget.getAttribute('data-description-index'));
          const currentTime = Date.now();

          if (currentTime - lastUpdateTime > DEBOUNCE_TIME) {
            if (originalIndex !== null && i !== draggedOverIndex) {
              console.log('🟨 Drag Over:', { 
                draggedItemId,
                fromIndex: originalIndex,
                toIndex: i,
              });

              let previewPoints = [...originalPoints];
              const [movedPoint] = previewPoints.splice(originalIndex, 1);
              previewPoints.splice(i, 0, movedPoint);

              // Update x positions and connections in preview
              previewPoints = previewPoints.map((point, index) => ({
                ...point,
                x: (index + 1) * G,
                connectsTo: index > 0 ? previewPoints[index - 1].id : undefined
              }));

              setLastUpdateTime(currentTime);
              setDraggedOverIndex(i);
              setPreviewPositions(previewPoints);
            }
          }
        }}

        onDragEnter={(e) => {
          e.preventDefault();
          if (draggedDescriptionIndex !== i) {
            setDraggedOverIndex(i);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (draggedOverIndex === i) {
            setDraggedOverIndex(null);
          }
        }}

        style={{
          position: 'absolute',
          left: `${point.x}px`,
          top: '50%',
          transform: 'translate(-50%,-50%)',
          opacity: draggedDescriptionIndex === i ? 0.5 : 1,  // Fade the dragged item
          marginBottom: '25px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          background: draggedOverIndex === i ? '#FFF9C4' : 'transparent',  // Highlight drop target
          padding: '0.5rem',
          borderRadius: '0.375rem',
          transition: 'all 0.2s ease',
          border: draggedOverIndex === i ? '2px dashed #FCD34D' : '2px solid transparent'  // Show drop zone
        }}
      >
      <div
        draggable
        onDragStart={(e) => {
          const currentPoints = getAllPoints();
          console.log('🟦 Drag Start:', { 
            index: i, 
            id: point.id,
            text: point.text,
            initialOrder: currentPoints.map(p => ({ id: p.id, x: p.x, text: p.text }))
          });

          e.dataTransfer.effectAllowed = 'move';
          setDraggedDescriptionIndex(i);
          setDraggedItemId(point.id);
          setOriginalPoints([...currentPoints]);  // Store initial order
          setOriginalIndex(i);
          document.body.classList.add('dragging');
        }}
              
        onDragEnd={() => {
          console.log('🟥 Drag End:', {
            fromIndex: originalIndex,
            toIndex: draggedOverIndex,
          });

          if (originalIndex !== null && draggedOverIndex !== null) {
            handleReorder(originalIndex, draggedOverIndex);
          }

          setDraggedDescriptionIndex(null);
          setDraggedOverIndex(null);
          setDraggedItemId(null);
          setPreviewPositions([]);
          setLastUpdateTime(0);
          setOriginalPoints(null);
          setOriginalIndex(null);
          document.body.classList.remove('dragging');
        }}

        onTouchStart={(e) => {
          e.stopPropagation();
          handleTouchStart(i, e);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: 'grab',
          padding: '0.25rem',
          color: '#666',
          transition: 'transform 0.2s',
          transform: draggedDescriptionIndex === i ? 'scale(0.95)' : draggedOverIndex === i ? 'scale(1.05)' : 'scale(1)',
          backgroundColor: draggedDescriptionIndex === i ? '#e5e7eb' : 'transparent',
          borderRadius: '0.25rem'
        }}
      >
        <GripVertical size={16} />
      </div>

  {/* Yellow and Blue Input Circles */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    gap: '0.5rem'
  }}>
    <Input
      type="text"
      value={point.text}
      readOnly
      onClick={() => handleInputClick(point, i)}
      onChange={e => handleTextInput(i, e.target.value, point.isGhost)}
      placeholder={`Description ${i + 1}`}
      className="r text-center"
      style={{ 
        height: '175px',
        width: '2.5rem',
        border: '1px solid #e2e8f0',
        borderRadius: '0.375rem'
      }}
    />
    <div style={{
      display: 'flex',
      gap: '0.5rem'  // Space between the circles
    }}>
      <div 
        onClick={() => {
          setDigitalPoints(prev => {
            const next = new Set(prev);
            if (next.has(point.id)) {
              next.delete(point.id);
            } else {
              next.add(point.id);
            }
            return next;
          });
        }}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '1px solid #666',
          backgroundColor: digitalPoints.has(point.id) ? '#FCD34D' : 'transparent', //Yellow
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
      />
      <div 
        onClick={() => {
          setBluePoints(prev => {
            const next = new Set(prev);
            if (next.has(point.id)) {
              next.delete(point.id);
            } else {
              next.add(point.id);
            }
            return next;
          });
        }}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '1px solid #666',
          backgroundColor: bluePoints.has(point.id) ? '#3B82F6' : 'transparent', //Blue
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
      />
    </div>
  </div>
</div>
</React.Fragment>
))}

</div>
</div>
</div>
)}

{modalOpen && (
  <div 
  style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
      height: '100vh',  // Use vh instead of percentage or dvh
      maxHeight: 'none',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      overflow: 'hidden'  // Prevent any scrolling
    }}
    onKeyDown={(e) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleTextInput(editingPoint.index, editText, editingPoint.point.isGhost);
        setModalOpen(false);
      }
    }}
    >
    <div style={{
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.5rem',
      width: '90%',
      maxWidth: '500px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
    <h2 style={{ margin: 0 }}>Edit Description</h2>
    <textarea
    ref={textareaRef}
    value={editText}
    onChange={(e) => setEditText(e.target.value)}
    style={{
      width: '100%',
      height: '150px',
      padding: '0.5rem',
      borderRadius: '0.25rem',
      border: '1px solid #e2e8f0'
    }}
    />
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      justifyContent: 'flex-end'
    }}>
    <Button 
    size="sm"
    variant="outline" 
    onClick={() => setModalOpen(false)}
    >
    Cancel{!isMobile && " (Esc)"}
    </Button>
    <Button
    size="sm"
    variant="outline"
    onClick={() => {
      handleTextInput(editingPoint.index, editText, editingPoint.point.isGhost);
      setModalOpen(false);
    }}
    >
    Save{!isMobile && " (⌘ + Enter)"}
    </Button>
    </div>
    </div>
    </div>
    )}
</div>
);
};

export default InteractiveDrawing;