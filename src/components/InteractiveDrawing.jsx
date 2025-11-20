import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Save, Plus, RotateCwSquare, RotateCcwSquare, Download, Settings, Share } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { GripVertical } from 'lucide-react';
import { jsPDF } from 'jspdf';
import ReactDOM from 'react-dom';
import { PiListDashesBold } from "react-icons/pi";
import { TbChartDots3 } from "react-icons/tb";
import { MdOutlineAutoGraph, MdHideSource, MdOutlineSsidChart } from "react-icons/md";
import { IoMdColorPalette } from "react-icons/io";
import { MdContentCopy } from "react-icons/md";
import * as QRCode from 'qrcode';



// Constants for the grid and layout
const G = 75;  // Grid size
const T = 175; // Text width
const H = '70%'; // Drawing height
const P = 8;   // Point radius
const D = 32;  // Hover area size
const MOBILE_BREAKPOINT = 1375;  // Mobile breakpoint in pixels

const isIPad = () => {
  const isIpadOS = navigator.userAgent.includes('iPad');
  const isIpadMac = navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 0;
  return isIpadOS || isIpadMac;
};



// Generate hash points for the grid
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

// Simple homepage URL - no data compression needed
const generateHomepageURL = () => {
  return 'https://sumpoints.com';
};

const decompressDrawingData = (compressedData) => {
  try {
    const jsonString = atob(compressedData);
    const optimized = JSON.parse(jsonString);
    
    // Create scaffolding events
    const points = Array.from({length: optimized.c}, (_, i) => ({
      x: (i + 1) * 75,
      y: 50, // All start at center line
      text: `Event ${i + 1}`, // Generic text
      id: Date.now() + i
    }));
    
    const drawingData = {
      version: optimized.v,
      filename: optimized.f + ' (Imported)',
      flows: [{
        id: "imported-flow",
        name: "Imported Flow",
        points: points,
        digitalPoints: new Set(), // No colors
        bluePoints: new Set()     // No colors
      }],
      activeFlowId: "imported-flow"
    };
    
    console.log('Created scaffolding with', points.length, 'events');
    return drawingData;
  } catch (error) {
    console.error('Decompression failed:', error);
    return null;
  }
};

const generateShareableURL = () => {
  return 'https://sumpoints.com';
};

// Mobile Flow Pills Component

// Modified MobileFlowPills with pill editing experience
const MobileFlowPills = ({ flows, activeFlowId, onSelectFlow, onAddFlow, onDeleteFlow, onRenameFlow, onDuplicateFlow }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  
  // Add ref and outside click handling for dropup menus
  useEffect(() => {
    if (openMenuId !== null) {
      const handleClickOutside = (event) => {
        const isMenuButton = event.target.closest('[data-menu-button]');
        const isInsideMenu = event.target.closest('.dropup-menu-content');
        
        if (!isMenuButton && !isInsideMenu) {
          setOpenMenuId(null);
        }
      };
      
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 10);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [openMenuId]);
  
  // Menu toggle function
  const handleMenuClick = (e, flowId) => {
    e.stopPropagation();
    setOpenMenuId(prevId => prevId === flowId ? null : flowId);
  };
  
  // Function to start editing a flow
  const handleEditClick = (flowId, flowName) => {
    setOpenMenuId(null); // Close the menu
    setEditingId(flowId); // Set which flow is being edited
    setEditingName(flowName); // Initialize with current name
  };
  
  // Function to save edited flow name
  const handleSaveEdit = (flowId) => {
    if (editingName.trim()) {
      onRenameFlow(flowId, editingName.trim());
      setEditingId(null); // Exit edit mode
    }
  };
  
  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      padding: '0.5rem',
      gap: '1rem',
      borderBottom: '1px solid #848484ff'
    }}>
      
      {/* Add Flow Button - First in the list */}
      <button
        style={{
          padding: '0.5rem 1.25rem',
          marginLeft: '.5rem',
          borderRadius: '9999px',
          border: '1px solid #848484ff',
          backgroundColor: 'white',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '44px',
          height: '38px',
          flexShrink: 0 // Prevent shrinking
        }}
        onClick={onAddFlow}
      >
        +
      </button>
      
      {/* Flow Pills */}
      {flows.map(flow => (
        <div key={flow.id} style={{ position: 'relative' }}>
          {editingId === flow.id ? (
            // EDIT MODE - Transform the pill itself
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '9999px',
                border: '1px solid #3b82f6',
                backgroundColor: 'white',
                height: '38px',
                boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)',
                padding: '0 0.25rem 0 0.75rem',
                width: 'auto',
                maxWidth: '250px',
                justifyContent: 'flex-start', // Changed from 'space-between'
                transition: 'none'
              }}
            >
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(flow.id);
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                autoFocus
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  width: `${Math.max(editingName.length * 9 + 20, 100)}px`, // Back to dynamic sizing
                  maxWidth: '160px', // But cap it so button stays visible
                  fontSize: '14px',
                  padding: '0',
                  paddingLeft: '.25rem',
                  color: '#1f2937'
                }}
              />
              
              <div style={{ 
                display: 'flex',
                paddingLeft: '0.563rem',   // 9px total - matches the 9px per character
                marginLeft: '0',           // Remove margin entirely
                height: '100%',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => handleSaveEdit(flow.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: 0
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            // NORMAL VIEW MODE
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '9999px',
                border: '1px solid #848484ff',
                backgroundColor: flow.id === activeFlowId ? '#3b82f6' : 'white',
                overflow: 'hidden',
                height: '38px',
              }}
            >
              
              {/* Flow name section */}
              <div
                onClick={() => onSelectFlow(flow.id)}
                style={{
                  padding: '0.5rem 1rem',
                  color: flow.id === activeFlowId ? 'white' : '#1f2937',
                  fontWeight: flow.id === activeFlowId ? '400' : '400',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {flow.name}
              </div>

              {/* Menu button */}
              <div
                data-menu-button={flow.id}
                onClick={(e) => handleMenuClick(e, flow.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 0.75rem',
                  height: '100%',
                  backgroundColor: flow.id === activeFlowId ? 
                    'rgba(255, 255, 255, 0.15)' : 
                    'rgba(0, 0, 0, 0.03)',
                  cursor: 'pointer',
                  minWidth: '44px',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" 
                  fill={flow.id === activeFlowId ? "white" : "#6b7280"}  // Remove fill="none", set actual fill
                  stroke={flow.id === activeFlowId ? "white" : "#6b7280"} strokeWidth="2.5">
                  <circle cx="12" cy="12" r="1.5"></circle>  {/* Remove fill="currentColor" */}
                  <circle cx="12" cy="5" r="1.5"></circle>
                  <circle cx="12" cy="19" r="1.5"></circle>
                </svg>
              </div>
            </div>
          )}
          
          {/* DROPUP MENU - Using portal */}
          {openMenuId === flow.id && (
            <Portal>
              <div
                className="dropup-menu-content"
                style={{
                  position: 'absolute',
                  backgroundColor: 'white',
                  border: '1px solid #848484ff',
                  borderRadius: '0.375rem',
                  boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
                  width: '150px',
                  pointerEvents: 'auto',
                  zIndex: 9999,
                  overflow: 'hidden'
                }}
                ref={el => {
                  if (el) {
                    // Get the position of the button element
                    const button = document.querySelector(`[data-menu-button="${flow.id}"]`);
                    if (button) {
                      const rect = button.getBoundingClientRect();
                      // Position the menu above the button
                      el.style.top = `${rect.top - el.offsetHeight - 8}px`;
                      el.style.left = `${rect.right - el.offsetWidth}px`;
                    }
                  }
                }}
              >
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    width: '100%',
                    textAlign: 'left',
                    borderBottom: '1px solid #848484ff',
                    backgroundColor: 'white'
                  }}
                  onClick={() => {
                    handleEditClick(flow.id, flow.name);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit</span>
                </button>
                
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    width: '100%',
                    textAlign: 'left',
                    borderBottom: '1px solid #848484ff',
                    backgroundColor: 'white'
                  }}
                  onClick={() => {
                    console.log('Duplicate clicked for flow:', flow);
                    onDuplicateFlow(flow);
                    setOpenMenuId(null);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                    <rect x="9" y="9" width="14" height="14" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Duplicate</span>
                </button>
                
                {flows.length > 1 && (
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      width: '100%',
                      textAlign: 'left',
                      backgroundColor: 'white'
                    }}
                    onClick={() => {
                      if (confirm(`Delete flow "${flow.name}"?`)) {
                        onDeleteFlow(flow.id);
                      }
                      setOpenMenuId(null);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </Portal>
          )}
        </div>
      ))}
    </div>
  );
};

const Portal = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const portalRoot = useRef(null);

  useEffect(() => {
    // Create a div that will be the portal's root
    portalRoot.current = document.createElement('div');
    portalRoot.current.style.position = 'fixed';
    portalRoot.current.style.zIndex = '9999';
    portalRoot.current.style.top = '0';
    portalRoot.current.style.left = '0';
    portalRoot.current.style.width = '100%';
    portalRoot.current.style.height = '100%';
    portalRoot.current.style.pointerEvents = 'none';
    document.body.appendChild(portalRoot.current);
    setMounted(true);

    return () => {
      if (portalRoot.current) {
        document.body.removeChild(portalRoot.current);
      }
    };
  }, []);

  if (!mounted || !portalRoot.current) {
    return null;
  }

  // Use createPortal to render children into the portal root
  return ReactDOM.createPortal(children, portalRoot.current);
};

// Desktop Flow Dropdown Component
const DesktopFlowDropdown = ({ flows, activeFlowId, onSelectFlow, onAddFlow, onDeleteFlow, onRenameFlow, onDuplicateFlow }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // UeEffect to handle outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // Add new state for editing
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [editingName, setEditingName] = useState("");
  
  // Function to handle the rename flow action
  const handleRenameFlow = (flowId, newName) => {
    console.log('Attempting to rename flow:', flowId, 'to:', newName);
    // Call the prop function passed from parent
    if (newName.trim()) {
      console.log('Calling onRenameFlow with:', flowId, newName.trim());
      onRenameFlow(flowId, newName.trim());
      setEditingFlowId(null);
    } else {
      console.log('New name is empty, not renaming');
      setEditingFlowId(null);
    }
  };
  
  // Your existing useEffect and other code...
  
  // Get active flow name
  const activeFlow = flows.find(flow => flow.id === activeFlowId) || flows[0];
  
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flow-dropdown-button"
        style={{
          padding: '0.5rem 1rem',
          border: 'none',
          borderRadius: '0.375rem',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          fontSize: '1rem',
          height: '2.25rem',
          width: 'auto', // Changed from '240px' to 'auto'
          minWidth: '120px', // Minimum width so it doesn't get too small
          maxWidth: '300px' // Maximum width so it doesn't get too wide
        }}
      >
        <span>{activeFlow?.name}</span>
        <div style={{ display: 'flex', alignItems: 'center' }}>  {/* Wrap arrow */}
          <span style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s'
          }}>▼</span>
        </div>
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 0.25rem)',
          left: 0,
          zIndex: 10,
          backgroundColor: 'white',
          border: '1px solid #848484ff',
          borderRadius: '0.375rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          width: '240px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>

          {/* Add Flow Option */}
          <button
            onClick={() => {
              onAddFlow();
              setIsOpen(false);
            }}
            className="dropdown-option" // Add CSS class instead
            style={{
              padding: '0.5rem 1rem',
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderBottom: '1px solid #d1d5db',
              backgroundColor: 'white' // Base color
            }}
            // Remove onMouseEnter and onMouseLeave
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',        // Add explicit font size
              lineHeight: '1',         // Remove line-height spacing
              marginLeft: 'auto',
              marginRight: 'auto',
              marginBottom: '0.25rem',
              marginTop: '0.25rem',
            }}>Add a new flow</span>
          </button>

          {/* Flow items */}
          {flows.map((flow, index) => (
          <div
            key={flow.id}
            className={`flow-item ${flow.id === activeFlowId ? 'active' : ''}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              width: '100%',
              backgroundColor: flow.id === activeFlowId ? '#f3f4f6' : 'white',
              borderBottom: index === flows.length - 1 ? 'none' : '1px solid #e2e8f0' // Remove border from last item
            }}
          >
              {editingFlowId === flow.id ? (
                // Edit mode
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameFlow(flow.id, editingName);
                    if (e.key === 'Escape') setEditingFlowId(null);
                  }}
                  autoFocus
                  style={{
                    width: '70%',
                    padding: '0.25rem',
                    border: '1px solid #848484ff',
                    borderRadius: '0.25rem',
                    marginRight: '0.75rem', // Add this line to create more spacing
                    color: '#1f2937' // Add this line to force black text
                  }}
                />
              ) : (
                
                // View mode
                <button
                  onClick={() => {
                    onSelectFlow(flow.id);
                    setIsOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    width: '70%',
                    padding: 0
                  }}
                >
                  {flow.name}
                </button>
              )}
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {/* Edit button */}
                {editingFlowId === flow.id ? (
                  // Save button when editing
                  <button
                    onClick={() => {
                      console.log('Save button clicked'); 
                      handleRenameFlow(flow.id, editingName);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: flow.id === activeFlowId ? 'white' : '#10b981', // Conditional color
                      cursor: 'pointer',
                      opacity: flow.id === activeFlowId ? 1 : 0.7, // Full opacity when active
                      padding: '4px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                ) : (
                  // Edit button when not editing
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFlowId(flow.id);
                      setEditingName(flow.name);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: flow.id === activeFlowId ? 'white' : '#60a5fa', // Conditional color
                      cursor: 'pointer',
                      opacity: flow.id === activeFlowId ? 1 : 0.7, // Full opacity when active
                      padding: '4px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                )}

                {/* Duplicate button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateFlow(flow);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: flow.id === activeFlowId ? 'white' : '#60a5fa',
                    cursor: 'pointer',
                    opacity: flow.id === activeFlowId ? 1 : 0.7,
                    padding: '4px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>

                {/* Delete button */}
                {flows.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete flow "${flow.name}"?`)) {
                        onDeleteFlow(flow.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: flow.id === activeFlowId ? 'white' : '#ef4444', // Conditional color
                      cursor: 'pointer',
                      opacity: flow.id === activeFlowId ? 1 : 0.7, // Full opacity when active
                      padding: '4px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                  </button>
                )}

              </div>
            </div>
          ))}
          

        </div>
      )}
    </div>
  );
};



const InteractiveDrawing = () => {
 // State management
 // const [points, setPoints] = useState([]);
  const [ghostPoints, setGhostPoints] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [filename, setFilename] = useState('');
  const [cursor, setCursor] = useState({ x: 0, y: 50 });
  const textareaRef = useRef(null);  // Add this here with other refs
  const [rotated, setRotated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState(null);
  const [hoveredPointId, setHoveredPointId] = useState(null);
  const [hoveredInsertId, setHoveredInsertId] = useState(null);
  const [justDropped, setJustDropped] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [editText, setEditText] = useState('');
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
  const [showDigitalCutout, setShowDigitalCutout] = useState(false);
  const [showAnalyticsCutout, setShowAnalyticsCutout] = useState(false);
  const [cutoutType, setCutoutType] = useState('none');
  const [hasTouchCapability] = useState('ontouchstart' in window);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT || isIPad());
  const [showTransition, setShowTransition] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('right'); // 'right' or 'bottom'
  const [flows, setFlows] = useState([
    {
      id: "flow-1",
      name: "Flow 1",
      points: [],
      digitalPoints: new Set(),
      bluePoints: new Set()
    }
  ]);
  const [activeFlowId, setActiveFlowId] = useState("flow-1");
  const [svgBounds, setSvgBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [hideSvgContent, setHideSvgContent] = useState(false);
  const [pointsMode, setPointsMode] = useState('show'); // 'show', 'hide', or 'delete'
  const [hoveredButton, setHoveredButton] = useState(null);
  
  const getHoverHandlers = (buttonName) => {
    if (isMobile) {
      return {};
    }
    return {
      onMouseEnter: () => setHoveredButton(buttonName),
      onMouseLeave: () => setHoveredButton(null)
    };
  };

  const [isHoveringChart, setIsHoveringChart] = useState(false);

  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
  // More strict PWA detection - need both conditions to be true
  const matchesStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isStandaloneModern = window.navigator.standalone === true;
  
  // Additional check: PWAs typically don't have browser UI
  const hasMinimalUI = window.outerHeight - window.innerHeight < 100; // Less browser chrome
  
  // Only consider it a PWA if multiple indicators agree
  const detectedPWA = (matchesStandalone || isStandaloneModern) && hasMinimalUI;
  
  setIsPWA(detectedPWA);
}, []);

const handleSaveAndAddAnother = () => {
  console.log('Before save - Current points:', points);
  console.log('Trying to save:', { index: editingPoint.index, text: editText });
  
  // Store the current index before any state changes
  const currentIndex = editingPoint.index;
  
  // Save the current point AND create new point in one state update
  setActivePoints(prevPoints => {
    // First, save the current point's text (always save, even if empty)
    const updatedPoints = prevPoints.map(p => 
      p.id === editingPoint.point.id ? {...p, text: editText} : p
    );
    
    console.log('Updated points after save:', updatedPoints);
    
    // Then insert the new point after the current one
    const newPoint = {
      x: (currentIndex + 2) * G,
      y: 50,
      text: '',
      id: Date.now()
    };
    
    const newPoints = [...updatedPoints];
    newPoints.splice(currentIndex + 1, 0, newPoint);
    
    // Recalculate x positions for all points WITH proper mobile spacing
    const finalPoints = newPoints.map((point, index) => ({
      ...point,
      x: (isMobile && rotated) ? (index + 1) * (G * 1.5) : (index + 1) * G
    }));
    
// Use setTimeout to ensure state is updated before opening new modal
    setTimeout(() => {
      // Find the newly created point in the updated points array
      const newPointIndex = currentIndex + 1;
      const actualNewPoint = finalPoints[newPointIndex];
      
      // Scroll to show the new point behind the modal
      scrollToPoint(actualNewPoint.x);
      
      setEditingPoint({
        point: actualNewPoint,
        index: newPointIndex
      });
      setEditText('');
    }, 50);
    
    return finalPoints;
  });
};

// Add this function inside your component (before the return statement)
const getAdjacentEventNames = () => {
  const currentIndex = editingPoint.index;
  const allPoints = getAllPoints();
  
  const previousEvent = currentIndex > 0 ? allPoints[currentIndex - 1] : null;
  const nextEvent = currentIndex < allPoints.length - 1 ? allPoints[currentIndex + 1] : null;
  
  const previousName = previousEvent?.text || `Event ${currentIndex}`;
  const nextName = nextEvent?.text || `Event ${currentIndex + 2}`;
  
  return { previousName, nextName };
};


const [recentTouch, setRecentTouch] = useState(false);

const renameFlow = (flowId, newName) => {
  console.log('renameFlow called with:', flowId, newName);
  console.log('Current flows before rename:', flows);
  
  setFlows(currentFlows => {
    const updatedFlows = currentFlows.map(flow => 
      flow.id === flowId 
        ? { ...flow, name: newName } 
        : flow
    );
    console.log('Updated flows after rename:', updatedFlows);
    return updatedFlows;
  });
};

const deleteFlow = (flowId) => {
  console.log('Deleting flow:', flowId);
  console.log('Current flows:', flows);
  
  // Don't allow deleting the last flow
  if (flows.length <= 1) {
    console.log('Cannot delete the last flow');
    return;
}
  
  // If we're deleting the active flow, select another flow
  let newActiveId = activeFlowId;
  if (flowId === activeFlowId) {
    // Find another flow to make active
    const flowIndex = flows.findIndex(f => f.id === flowId);
    const newIndex = flowIndex > 0 ? flowIndex - 1 : 1; // Go to previous or next
    newActiveId = flows[newIndex].id;
    console.log('New active flow will be:', newActiveId);
  }
  
  // Remove the flow
  setFlows(flows.filter(flow => flow.id !== flowId));
  
  // Update active flow if needed
  if (newActiveId !== activeFlowId) {
    setActiveFlowId(newActiveId);
  }
  
  console.log('Flows after deletion:', flows.filter(flow => flow.id !== flowId));
};

  const getActiveFlow = () => {
    return flows.find(flow => flow.id === activeFlowId) || flows[0];
  };

  const points = getActiveFlow().points;
  const digitalPoints = getActiveFlow().digitalPoints;
  const bluePoints = getActiveFlow().bluePoints;

  // Updated addNewFlow function with proper numbering and auto-selection
  const addNewFlow = () => {
    // Find the highest number in existing flow names
    const highestNumber = flows.reduce((max, flow) => {
      // Extract the number from the flow name (assuming format "Flow X")
      const match = flow.name.match(/Flow (\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    // Use the next number after the highest
    const newFlowNumber = highestNumber + 1;
    const newFlowId = `flow-${Date.now()}`; // Use timestamp for unique ID
    
    const newFlow = {
      id: newFlowId,
      name: `Flow ${newFlowNumber}`,
      points: [],
      digitalPoints: new Set(),
      bluePoints: new Set()
    };
    
    // Add the new flow to the beginning of the array (right after the + button)
    setFlows([newFlow, ...flows]);
    
    // Automatically select the new flow
    setActiveFlowId(newFlowId);
  };

  // Add this new function next to your addNewFlow function
  const duplicateFlow = (flowToDuplicate) => {
    const newFlowId = `flow-${Date.now()}`;
    
    const newFlow = {
      id: newFlowId,
      name: `${flowToDuplicate.name} Copy`,
      points: [...flowToDuplicate.points],
      digitalPoints: new Set(flowToDuplicate.digitalPoints),
      bluePoints: new Set(flowToDuplicate.bluePoints)
    };
    
    // Find the index of the original flow
    const originalIndex = flows.findIndex(f => f.id === flowToDuplicate.id);
    
    // Insert the duplicate right after the original
    setFlows(prevFlows => {
      const newFlows = [...prevFlows];
      newFlows.splice(originalIndex + 1, 0, newFlow);
      return newFlows;
    });
    
    // Switch to the new flow
    setActiveFlowId(newFlowId);
  };

  const updateActiveFlow = (updates) => {
    setFlows(currentFlows => 
      currentFlows.map(flow => 
        flow.id === activeFlowId 
          ? { ...flow, ...updates } 
          : flow
      )
    );
  };

  const setActivePoints = (newPointsOrUpdater) => {
    const activeFlow = getActiveFlow();
    const newPoints = typeof newPointsOrUpdater === 'function'
      ? newPointsOrUpdater(activeFlow.points)
      : newPointsOrUpdater;
      
    updateActiveFlow({ points: newPoints });
  };

const setActiveDigitalPoints = (newSetOrUpdater) => {
  const activeFlow = getActiveFlow();
  const currentSet = activeFlow.digitalPoints;
  
  // Handle functional updates (like when you do setActiveDigitalPoints(prev => {...}))
  const newSet = typeof newSetOrUpdater === 'function'
    ? newSetOrUpdater(currentSet)
    : newSetOrUpdater;
    
  updateActiveFlow({ digitalPoints: newSet });
};

const setActiveBluePoints = (newSetOrUpdater) => {
  const activeFlow = getActiveFlow();
  const currentSet = activeFlow.bluePoints;
  
  // Handle functional updates
  const newSet = typeof newSetOrUpdater === 'function'
    ? newSetOrUpdater(currentSet)
    : newSetOrUpdater;
    
  updateActiveFlow({ bluePoints: newSet });
};


// Add this effect to trigger the marching ants animation when flows change
const [hideAnts, setHideAnts] = useState(false);

// Modify the flow switching effect
// Add more debug logging to track the sequence
// In the flow change effect, before setting the transition
useEffect(() => {
 console.log("🔄 FLOW CHANGE DETECTED");
 
 // 1. Set white background on ALL potential gray containers
 if (drawingRef.current) {
   drawingRef.current.style.backgroundColor = 'white';
   drawingRef.current.style.visibility = 'hidden';
 }
 
 if (containerRef.current) {
   containerRef.current.style.backgroundColor = 'white';
 }
 
 if (scrollRef.current) {
   scrollRef.current.style.backgroundColor = 'white';
 }
 
 // Force repaint
 if (drawingRef.current) {
   drawingRef.current.offsetHeight;
 }
 
 // 2. Start the white overlay transition
 setShowTransition(true);
 setTransitionDirection(rotated ? 'bottom' : 'right');
 
 // 3. Update layout (under the hidden SVG)
 setCursor({ x: 50, y: 50 });
 
 if (containerRef.current) {
   const activePoints = getActiveFlow().points;
   const newDimension = ((activePoints.length + 4) * G);
   
   if (!rotated) {
     containerRef.current.style.width = `${newDimension}px`;
   } else {
     containerRef.current.style.height = `${newDimension}px`;
   }
 }
 
 // 4. Make SVG visible again BEFORE the white overlay starts to pull away
 setTimeout(() => {
   if (drawingRef.current) {
     drawingRef.current.style.visibility = 'visible';
     drawingRef.current.style.backgroundColor = '#f9fafb';
   }
   if (containerRef.current) {
     containerRef.current.style.backgroundColor = '#f9fafb';
   }
   if (scrollRef.current) {
     scrollRef.current.style.backgroundColor = '#f9fafb';
   }
 }, 300);
 
 // 5. Hide transition overlay after animation completes
 const hideTimer = setTimeout(() => {
   setShowTransition(false);
 }, 1000);
 
 return () => clearTimeout(hideTimer);
}, [activeFlowId, rotated]);

useEffect(() => {
  if (drawingRef.current) {
    const updateSvgBounds = () => {
      const rect = drawingRef.current.getBoundingClientRect();
      setSvgBounds({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };
    
    updateSvgBounds();
    window.addEventListener('resize', updateSvgBounds);
    return () => window.removeEventListener('resize', updateSvgBounds);
  }
}, [activeFlowId, rotated]);

//useEffect for flow changes
useEffect(() => {
  console.log("Active flow changed:", activeFlowId);
  
  // Hide SVG content immediately
  setHideSvgContent(true);
  
  // Trigger layout fixes with invisible marching ants
  setHideAnts(true);
  setCursor({ x: 50, y: 50 });
  
  // Multiple triggers for desktop
  const timers = [
    setTimeout(() => setCursor({ x: 51, y: 51 }), 50),
    setTimeout(() => setCursor({ x: 52, y: 52 }), 100),
    setTimeout(() => setCursor({ x: 53, y: 53 }), 150),
    
    // Show SVG content again after layout is fixed
    setTimeout(() => {
      setHideSvgContent(false);
      setHideAnts(false);
      setCursor({ x: 0, y: 0 });
    }, 200)
  ];
  
  // Force width update directly
  if (containerRef.current) {
    const activePoints = getActiveFlow().points;
    if (!rotated) {
      const newWidth = ((activePoints.length + 4) * G);
      containerRef.current.style.width = `${newWidth}px`;
    } else {
      const newHeight = ((activePoints.length + 4) * G);
      containerRef.current.style.height = `${newHeight}px`;
    }
  }
  
  return () => timers.forEach(clearTimeout);
}, [activeFlowId, rotated]);


  useEffect(() => {
    // This will trigger when flows or activeFlowId change
    console.log("Active flow changed:", activeFlowId);
    // Don't need to do anything here as the local variables will be re-initialized on each render
  }, [flows, activeFlowId]);

  console.log('Mobile check:', { 
    isMobile, 
    windowWidth: window.innerWidth, 
    MOBILE_BREAKPOINT 
  });

  const getCutoutStats = (points, digitalPoints, bluePoints, cutoutType) => {
    if (cutoutType === 'none') return null;

    const totalPoints = points.length;
    let notCovered = 0;  // Changed from 'covered'

    if (cutoutType === 'yellow') {
      notCovered = points.filter(p => digitalPoints.has(p.id)).length;  // These points get hatching
    } else if (cutoutType === 'blue') {
      notCovered = points.filter(p => bluePoints.has(p.id)).length;
    } else if (cutoutType === 'both') {
      notCovered = points.filter(p => digitalPoints.has(p.id) && bluePoints.has(p.id)).length;
    }

    const covered = totalPoints - notCovered;  // Now these are the ones without hatching
    const coveredPercent = Math.round((covered / totalPoints) * 100);
    const notCoveredPercent = Math.round((notCovered / totalPoints) * 100);

    return {
      covered,
      notCovered,
      coveredPercent,
      notCoveredPercent
    };
  };

  const saveToLocalStorage = () => {
    // Don't save if we're initializing
    if (flows.length === 0 || (flows.length === 1 && flows[0].points.length === 0 && filename === '')) {
      return;
    }
    
    // Convert Sets to Arrays for serialization
    const serializedFlows = flows.map(flow => ({
      ...flow,
      digitalPoints: Array.from(flow.digitalPoints),
      bluePoints: Array.from(flow.bluePoints)
    }));
    
    const state = {
      flows: serializedFlows,
      activeFlowId,
      filename
    };
    
    console.log('Saving state:', state);
    localStorage.setItem('drawingState', JSON.stringify(state));
  };

  const handlePdfExport = async () => {
    console.log('Starting PDF export');

    // Get the active flow
    const activeFlow = getActiveFlow();
    const allPoints = getAllPoints(); // Active flow points for main export

    console.log('Points gathered:', allPoints);
    console.log('Active flow:', activeFlow);

    // Generate simple homepage QR code
    let qrCodeDataURL = null;
    const shareURL = generateShareableURL();

    console.log('ShareURL result:', shareURL); // Add this line
    console.log('ShareURL length:', shareURL ? shareURL.length : 'null'); // Add this line

    if (shareURL) {
      try {
        qrCodeDataURL = await QRCode.toDataURL(shareURL, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        console.log('Homepage QR code generated for:', shareURL);
      } catch (error) {
        console.error('QR code generation failed:', error);
      }
    }

    // Add the formatted filename here, right after getting allPoints
    const formattedFilename = `${filename}_${activeFlow.name}_${allPoints.length} Events${
      cumulativeType !== 'none' ? `_Cumulative Score ${calculateScores(activeFlow.points).total}` : ''
    }${
      cumulativeType === 'bars' ? '_Bars' : 
      cumulativeType === 'line' ? '_Line' : ''
    }${
      cutoutType === 'yellow' ? '_Yellow Cutout' :
      cutoutType === 'blue' ? '_Blue Cutout' :
      cutoutType === 'both' ? '_Green Cutout' : ''
    }`;
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
    const scores = calculateScores(allPoints);
    const svgContent = `
    <svg 
      width="${totalWidth * scale}px"
      height="${600 * scale}px" 
      viewBox="0 0 ${totalWidth} 600"
      style="background-color: white;"
      preserveAspectRatio="xMidYMid meet"
      shape-rendering="geometricPrecision"
    >
      <defs>
        <pattern id="print-grid" width="${G}" height="100%" patternUnits="userSpaceOnUse">
          ${HASH_POINTS.map((hp, i) => `
            <line 
              x1="-6" y1="${hp}%" 
              x2="6" y2="${hp}%" 
              stroke="grey"
            />
          `).join('')}
        </pattern>

        <!-- Add hatching patterns -->
        <pattern id="yellow-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0,10 l10,-10 M-2,12 l14,-14 M8,12 l4,-4" 
            stroke="black" 
            strokeWidth="1"
            fill="none"
          />
        </pattern>

        <pattern id="blue-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10,10 l-10,-10 M12,12 l-14,-14 M-2,2 l4,-4" 
            stroke="black" 
            strokeWidth="1"
            fill="none"
          />
        </pattern>

        <!-- Both hatches - crossing pattern (#) -->
          <pattern id="both-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
            <!-- Yellow direction (\) -->
            <path d="M0,10 l10,-10 M-2,12 l14,-14 M8,12 l4,-4" 
              stroke="black" 
              strokeWidth="1"
              fill="none"
            />
            <!-- Blue direction (/) -->
            <path d="M10,10 l-10,-10 M12,12 l-14,-14 M-2,2 l4,-4" 
              stroke="black" 
              strokeWidth="1"
              fill="none"
            />
          </pattern>
      </defs>

      <!-- Background grid elements -->
      <rect x="${G}" width="${totalWidth - G}" height="100%" fill="url(#print-grid)"/>
      
      <!-- Vertical grid lines -->
      <line x1="0" y1="0" x2="0" y2="100%" stroke="grey"/>
      <line x1="${G}" y1="0" x2="${G}" y2="100%" stroke="#ADADAD"/>
      ${Array.from({ length: Math.ceil(totalWidth / G) }, (_, i) => 
        `<line 
          x1="${(i + 1) * G}" 
          y1="0" 
          x2="${(i + 1) * G}" 
          y2="100%" 
          stroke="grey"
        />`
      ).join('')}

      <!-- Center line - moved after grid elements -->
      <line x1="0" y1="50%" x2="${totalWidth}" y2="50%" stroke="grey" stroke-width="1"/>

      <!-- Add cutout patterns if selected -->
      ${cutoutType !== 'none' ? 
        Array.from({ length: Math.ceil(totalWidth / G) }, (_, i) => {
          const x = (i + 1) * G;
          const point = allPoints.find(p => p.x === x);
          
          if (!point) return '';
          
          let pattern = '';
          if (cutoutType === 'yellow' && !digitalPoints.has(point.id)) {
            pattern = 'url(#yellow-hatch)';
          } else if (cutoutType === 'blue' && !bluePoints.has(point.id)) {
            pattern = 'url(#blue-hatch)';
          } else if (cutoutType === 'both' && !(digitalPoints.has(point.id) && bluePoints.has(point.id))) {
            pattern = 'url(#both-hatch)';
          }

          return pattern ? `
            <rect
              x="${x - G/2}"
              y="0"
              width="${G}"
              height="100%"
              fill="${pattern}"
              opacity="0.5"
            />
          ` : '';
        }).join('') 
      : ''}

${showPoints ? `
    <!-- Points and connecting lines | Including export stroke width -->
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
` : ''}


    <!-- Add cumulative visualization if selected -->
    ${cumulativeType === 'line' ? 
      (() => {
        const scale = 2; // PDF scale factor
        const gridFactor = 5; // Grid hash mark scale
        
        const points = scores.cumulative.map((score, i) => ({
          x: (i + 1) * G,
          y: 300 - (score * gridFactor * 6) // Use 6 for PDF scaling
        }));
        
        const pathData = points.reduce((path, point, index) => 
          index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`
        , '');
        
        return `
          <path
            d="${pathData}"
            stroke="#666666"
            stroke-width="3"
            fill="none"
          />
        `;
      })()
    : cumulativeType === 'bars' ?
      scores.cumulative.map((score, i) => {
        const gridFactor = 5; // Grid hash mark scale
        const offsetPercent = score * gridFactor;
        const barHeight = Math.abs(offsetPercent * 6); // Use 6 for PDF scaling
        const y = score >= 0 ? 300 - barHeight : 300;
        
        return `
          <rect
            x="${(i + 1) * G - (G * 0.4)}"
            y="${y}"
            width="${G * 0.8}"
            height="${barHeight}"
            fill="#666666"
          />
        `;
      }).join('')
    : ''}
  </svg>
`;

    // Inside the try block
    try {
    console.log('Creating PDF instance');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: 'letter'
    });

    // Before the PDF text gets set
    const stats = getCutoutStats(points, digitalPoints, bluePoints, cutoutType);
    const cutoutText = cutoutType !== 'none' && stats ? 
      `${cutoutType === 'yellow' ? 'Yellow' : cutoutType === 'blue' ? 'Blue' : 'Green'} Cutout: ` +
      `${stats.covered} Events Covered (${stats.coveredPercent}%), ` +
      `${stats.notCovered} Events Not Covered (${stats.notCoveredPercent}%)` 
      : '';

      // Keep the title as is
      pdf.setFontSize(16);
      pdf.text(filename, margins, margins);

      // Add title and count right after PDF creation
      pdf.setFontSize(12);
      pdf.text(
        `${activeFlow.name} / ${allPoints.length} Events${
          cumulativeType !== 'none' ? ` / Cumulative Score ${calculateScores(activeFlow.points).total}` : '' 
        }${
          cumulativeType === 'bars' ? ' / Bars' : 
          cumulativeType === 'line' ? ' / Line' : ''
        }${
          cutoutType !== 'none' ? ` / ${cutoutText}` : ''
        }`,
        margins, 
        margins + 0.3
      );
      const contentStart = margins + 0.5;

  // Aspect ratio calculations
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

        // Add QR code if generated successfully
        if (qrCodeDataURL) {
          const qrSize = 0.5; // Small QR code size
          const qrX = pageWidth - margins - qrSize + 0.02; // Right edge
          const qrY = margins - 0.18; // Top edge
          
          pdf.addImage(qrCodeDataURL, 'PNG', qrX, qrY, qrSize, qrSize);
          console.log('Added QR code to PDF');
        } else {
          console.log('No QR code data to add to PDF'); // Add this line
        }

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

            // ADD STRIKETHROUGH HERE - Only if cutout mode is active
            if (cutoutType !== 'none') {
              let shouldStrikethrough = false;
              
              if (cutoutType === 'yellow' && !digitalPoints.has(point.id)) {
                shouldStrikethrough = true; // Yellow cutout and point is NOT digital
              } else if (cutoutType === 'blue' && !bluePoints.has(point.id)) {
                shouldStrikethrough = true; // Blue cutout and point is NOT blue
              } else if (cutoutType === 'both' && !(digitalPoints.has(point.id) && bluePoints.has(point.id))) {
                shouldStrikethrough = true; // Both cutout and point doesn't have BOTH markers
              }
              
              if (shouldStrikethrough) {
                const textDimensions = pdf.getTextDimensions(textToWrite);
                const textWidth = textDimensions.w; // Actual width of the text
                
                pdf.setLineWidth(0.03); // Thick line
                pdf.setDrawColor(0, 0, 0); // Black color
                
                // Draw line matching exact text length (accounting for 90° rotation)
                pdf.line(
                  x - 0.03, // Slightly offset from text
                  pageHeight - margins - 0.2,
                  x - 0.03,
                  pageHeight - margins - 0.2 - textWidth // Extends for full text length
                );
              }
            }
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
    setHoveredPointId(null);  // Clear both hover states
    setHoveredInsertId(null);
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
  const handleInsertAt = (index, mouseEvent) => { // Accept the mouse event
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
    
    setActivePoints(newPoints);
    
    // Force layout recalculation
    if (containerRef.current) {
      const newDimension = ((newPoints.length + 4) * G);
      
      if (!rotated) {
        containerRef.current.style.width = `${newDimension}px`;
      } else {
        containerRef.current.style.height = `${newDimension}px`;
      }
      
      containerRef.current.offsetHeight;
    }
    
    // After layout is recalculated, determine which insert zone mouse is now over
    setTimeout(() => {
      if (mouseEvent) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = mouseEvent.clientX;
          const mouseY = mouseEvent.clientY;
          
          // Find which insert zone the mouse is now hovering over
          const updatedPoints = newPoints.map((p, i) => ({...p, x: (i + 1) * G}));
          
          for (let i = 1; i < updatedPoints.length; i++) {
            const point = updatedPoints[i];
            const insertX = rotated ? rect.left + (rect.width * 0.5) : rect.left + point.x - (G/2);
            const insertY = rotated ? rect.top + point.x - (G/2) : rect.top + (rect.height * 0.5);
            
            // Check if mouse is within this insert zone
            const inZone = rotated 
              ? Math.abs(mouseY - insertY) < 40 
              : Math.abs(mouseX - insertX) < 40;
            
            if (inZone) {
              setHoveredInsertId(point.id);
              return;
            }
          }
        }
      }
      
      setHoveredInsertId(null);
    }, 50);
  };


  // Refs for DOM elements
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const drawingRef = useRef(null);

  const getAllPoints = () => {
    const activeFlow = getActiveFlow();
    return activeFlow.points;
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

  // Recalculate x positions with proper spacing
  newPoints = newPoints.map((point, index) => ({
    ...point,
    // Apply increased spacing in rotated mobile view
    x: (isMobile && rotated) ? (index + 1) * (G * 1.5) : (index + 1) * G,
    // Each point should connect to the previous point
    connectsTo: index > 0 ? newPoints[index - 1].id : undefined
  }));

  setActivePoints(newPoints);
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
  if (recentTouch) return; // Prevent handleClick after recent touch
  
  // If preview box is open, close it and don't create a point
  if (tappedPoint) {
    setTappedPoint(null);
    return; // Exit early - don't create a point
  }
  
  console.log('Click event:', {
    editMode,
    dragging,
    hoveredPointId,
    hoveredInsertId,
    justDropped,
    target: e.target.closest('.drawing-area')
  });

  if (!drawingRef.current || dragging || hoveredPointId || hoveredInsertId || justDropped || 
    !e.target.closest('.drawing-area')) {
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

    setActivePoints(s => [...s, {x, y, isAbove: y < 50, text: '', id: Date.now()}]);
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
    if (!hasTouchCapability) {
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

  // Update resize listener to include iPad check:
useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT || isIPad());
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

useEffect(() => {
  const savedState = localStorage.getItem('drawingState');
  console.log('Loading saved state:', savedState);
  
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      console.log('Parsed state:', state);
      
      // Check if the saved state has the new flows structure
      if (state.flows) {
        // Convert arrays back to Sets for digitalPoints and bluePoints
        const deserializedFlows = state.flows.map(flow => ({
          ...flow,
          digitalPoints: new Set(flow.digitalPoints || []),
          bluePoints: new Set(flow.bluePoints || [])
        }));
        
        setFlows(deserializedFlows);
        setActiveFlowId(state.activeFlowId || deserializedFlows[0]?.id || "flow-1");
      } else if (state.points) {
        // Handle legacy format (before multiple flows)
        setFlows([{
          id: "flow-1",
          name: "Flow 1",
          points: state.points || [],
          digitalPoints: new Set(state.digitalPoints || []),
          bluePoints: new Set(state.bluePoints || [])
        }]);
      }
      
      // Only set filename if it exists and isn't empty
      if (state.filename && state.filename !== '') {
        setFilename(state.filename);
      }
    } catch (error) {
      console.error('Error parsing saved state:', error);
    }
  }
}, []);

// Update the useEffect for saving to localStorage
useEffect(() => {
  saveToLocalStorage();
}, [flows, activeFlowId, filename]);

  // UseEffect to maintain proper spacing at all times
  useEffect(() => {
    // Only do something if we're in the rotated view on mobile
    if (rotated && isMobile) {
      console.log("In rotated mobile view - updating spacing");
      
      // Apply increased spacing to all points
      setActivePoints(prevPoints => 
        prevPoints.map((point, index) => ({
          ...point,
          x: (index + 1) * (G * 1.5) // 50% more space between points
        }))
      );
    } else {
      // In horizontal view, ensure normal spacing
      setActivePoints(prevPoints => 
        prevPoints.map((point, index) => ({
          ...point,
          x: (index + 1) * G // Normal spacing
        }))
      );
    }
  }, [rotated, isMobile, activeFlowId]);

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
          setActivePoints(s => [...s, {...point, y: finalY, isAbove: finalY < 50, isGhost: false, id: point.id}]);
          setGhostPoints(s => s.filter(p => p.id !== point.id));
          setUndoStack([]);
        } else {
          setActivePoints(s => s.map(p => 
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

const increaseDescriptionSpacing = () => {
  if (isMobile && rotated) {
    setActivePoints(prevPoints => 
      prevPoints.map((point, index) => ({
        ...point,
        x: (index + 1) * (G * 1.5) // Increase spacing by 50%
      }))
    );
  }
};

const isFirstPointRef = useRef(true);



const addGhostPoint = () => {
  console.log('addGhostPoint called');
  const x = getNextX();
  
  // Check if this is the first point
  const isFirstPoint = points.length === 0;
  
  // If it's the first point, set the ref
  if (isFirstPoint) {
    isFirstPointRef.current = true;
  }
  
  // Create a new point
  setActivePoints(prevPoints => {
    const newPoints = [...prevPoints, {
      x: isMobile && rotated ? 
        (prevPoints.length + 1) * (G * 1.5) : 
        x,
      y: 50,
      text: '',
      id: Date.now()
    }];
    return newPoints;
  });
  
  // Force layout recalculation after adding point
  if (containerRef.current) {
    const newDimension = ((points.length + 1 + 4) * G);
    
    if (!rotated) {
      containerRef.current.style.width = `${newDimension}px`;
    } else {
      containerRef.current.style.height = `${newDimension}px`;
    }
    
    // Force browser to recalculate layout immediately
    containerRef.current.offsetHeight;
  }
  
  scrollToPoint(x);
  
  // For mobile, direct approach
  if (isMobile) {
    // Longer delay for first point
    setTimeout(() => {
      // Force open the modal for all points including first
      setEditingPoint({
        point: { id: Date.now(), text: '' },
        index: points.length
      });
      setEditText('');
      setModalOpen(true);
    }, isFirstPoint ? 300 : 200);
  }
};

useEffect(() => {
  if (modalOpen && isFirstPointRef.current && points.length > 0) {
    // This runs after the modal is opened for the first point
    setEditingPoint({
      point: points[0],
      index: 0
    });
    isFirstPointRef.current = false; // Reset for next time
  }
}, [modalOpen, points]);

// Add this as a new useEffect in your component
useEffect(() => {
  if (modalOpen && textareaRef.current) {
    // Delay focus to ensure keyboard appears on mobile
    const focusTimer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 300); // 300ms delay
    
    // Clean up the timer if component unmounts or modal closes
    return () => clearTimeout(focusTimer);
  }
}, [modalOpen]); // Only run when modal open state changes

  const handleTextInput = (index, text, isGhost) => {
    const point = getAllPoints()[index];
    if (isGhost) {
      setGhostPoints(s => s.map(p => 
        p.id === point.id ? {...p, text} : p
        ));
    } else {
      setActivePoints(s => s.map(p => 
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
      // Current calculation:
      const y = ((touch.clientY - rect.top) / rect.height) * 100;

      // Need to transform based on rotation:
      const yPos = rotated ? 
        ((touch.clientX - rect.left) / rect.width) * 100 : // Use X coordinate when rotated
        ((touch.clientY - rect.top) / rect.height) * 100;  // Use Y coordinate when not rotated

      setDraggedPoint(prev => ({...prev, z: yPos}));
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
      // This calculation determines how many hash marks away from center
      const distanceFromCenter = point.y > 50 ? 
        -Math.round((point.y - 50) / 5) : 
        Math.round((50 - point.y) / 5);
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
      : Math.abs(mouseX - nextX) < G/6;  // Keep horizontal the same

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
    {!dragging && !hoveredPointId && !hoveredInsertId && isNearNextLine && !isMobile && !hideAnts && (
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
      
      // Define a grid factor based on hash marks (each hash mark is 5 units)
      const gridFactor = 5; // 5 units per hash mark

      let segments = [];
      let currentSegment = { points: [], isPositive: scores.cumulative[0] >= 0 };

      scores.cumulative.forEach((score, i) => {
        // Calculate position based on orientation and grid factor
        let x, y;
        if (isVertical) {
          // For vertical, calculate percentage first then convert to pixels
          const offsetPercent = score * gridFactor;
          x = fromPercent(50 + offsetPercent, rect.width);
          y = (i + 1) * G;
        } else {
          // For horizontal, calculate percentage first then convert to pixels
          const offsetPercent = score * gridFactor;
          x = (i + 1) * G;
          y = fromPercent(50 - offsetPercent, rect.height);
        }

        if (i > 0 && (score >= 0) !== currentSegment.isPositive) {
          const prevScore = scores.cumulative[i - 1];

          // Calculate previous point based on orientation
          let prevX, prevY;
          if (isVertical) {
            const prevOffsetPercent = prevScore * gridFactor;
            prevX = fromPercent(50 + prevOffsetPercent, rect.width);
            prevY = i * G;
          } else {
            const prevOffsetPercent = prevScore * gridFactor;
            prevX = i * G;
            prevY = fromPercent(50 - prevOffsetPercent, rect.height);
          }

          const ratio = Math.abs(prevScore) / (Math.abs(prevScore) + Math.abs(score));

          // Calculate crossing point based on orientation
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

      return (
        <>
          {segments.map((segment, i) => {
            const points = segment.points;
            let d = `M ${points[0].x} ${points[0].y}`;
            
            for (let i = 1; i < points.length; i++) {
              d += ` L ${points[i].x} ${points[i].y}`;
            }

            return (
              <path
                key={`segment-${i}`}
                d={d}
                stroke={editMode ? 
                  (segment.isPositive ? "rgba(52, 211, 153, 0.3)" : "rgba(248, 113, 113, 0.3)") : 
                  (segment.isPositive ? "rgba(52, 211, 153, 1)" : "rgba(248, 113, 113, 1)")}
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
      
      // Define a grid factor based on hash marks (each hash mark is 5 units)
      // This will scale the bars to match exactly with grid lines
      const gridFactor = 5; // 5 units per hash mark
      
      return scores.cumulative.map((score, i) => {
        // Calculate height in grid units
        const barHeight = Math.abs(score * gridFactor);
        
        if (isVertical) {
          // Vertical orientation (bars extend left/right)
          const x = score >= 0 ? 
            fromPercent(50, rect.width) : 
            fromPercent(50, rect.width) - fromPercent(barHeight, rect.width);
          
          return (
            <rect
              key={`bar-${i}`}
              x={x}
              y={(i + 1) * G - (G * 0.4)}
              height={G * 0.8}
              width={fromPercent(barHeight, rect.width)}
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
          // Horizontal orientation (bars extend up/down)
          const y = score >= 0 ? 
            fromPercent(50, rect.height) - fromPercent(barHeight, rect.height) : 
            fromPercent(50, rect.height);
          
          return (
            <rect
              key={`bar-${i}`}
              x={(i + 1) * G - (G * 0.4)}
              y={y}
              width={G * 0.8}
              height={fromPercent(barHeight, rect.height)}
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
      const isHovered = hoveredPointId === point.id;  // Change this to use hoveredPointId
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
        onMouseEnter={() => !isMobile && setHoveredPointId(point.id)}
        onMouseLeave={() => !isMobile && setHoveredPointId(null)}
        onMouseDown={editMode ? undefined : handlePointDrag(i, point.isGhost)}
        onDoubleClick={editMode ? () => {
          const newPoints = points.filter((_, index) => index !== i);
          newPoints.forEach((point, index) => {
            point.x = (index + 1) * G;
          });
          setActivePoints(newPoints);
        } : undefined}
        onTouchStart={(e) => {
          if (editMode) return;
          e.stopPropagation();

          setTouchStartTime(Date.now());
          setTouchMoved(false);

          // Immediately initiate drag on touch start for mobile
          if (hasTouchCapability) {
            handlePointDrag(i, point.isGhost)(e);
          }

          setTouchedPointId(point.id);
          setRecentTouch(true);

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
          e.stopPropagation();
          // Clear the flag after a delay
          setTimeout(() => setRecentTouch(false), 100);
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
          } else if (touchDuration >= 200 && !touchMoved) {
            // Only close on long press (not drag)
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
              setActivePoints(s => [...s, {...point, y: finalY, isAbove: finalY < 50, isGhost: false, id: point.id}]);
              setGhostPoints(s => s.filter(p => p.id !== point.id));
              setUndoStack([]);
            } else {
              setActivePoints(s => s.map(p => 
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
        
        {/* Existing edit mode delete button */}
        {editMode && (
          <g 
            transform={`translate(${pos.x}, ${pos.y - 20})`}
            onClick={(e) => {
              e.stopPropagation();
              const newPoints = points.filter((_, index) => index !== i);
              newPoints.forEach((point, index) => {
                point.x = (index + 1) * G;
              });
              setActivePoints(newPoints);
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
        y={(() => {
          const text = point.text || 'No description';
          const LINE_LENGTH = 15;
          
          if (text.length <= LINE_LENGTH) {
            return pos.y - 40;  // Higher position for shorter box
          } else {
            return pos.y - 50;  // Current position for taller box
          }
        })()}
        width="120"
        height={(() => {
          const text = point.text || 'No description';
          const LINE_LENGTH = 15;
          
          if (text.length <= LINE_LENGTH) {
            return "80";   // Shorter height for single line
          } else {
            return "100";  // Current height for two lines
          }
        })()}
        rx="4"
        fill="white"
        stroke="#ddd"
        filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.1))"
      />
      
      {/* Point number */}
      <text
        x={pos.x + 30}
        y={(() => {
          const text = point.text || 'No description';
          const LINE_LENGTH = 15;
          
          if (text.length <= LINE_LENGTH) {
            return pos.y - 15;  // Adjusted for shorter box
          } else {
            return pos.y - 25;  // Current position for taller box
          }
        })()}
        fontSize="16"
        fill="black"
      >
        Event {i + 1}
      </text>
      
      {/* Description */}
      <text
        x={pos.x + 30}
        y={(() => {
          const text = point.text || 'No description';
          const LINE_LENGTH = 15;
          
          if (text.length <= LINE_LENGTH) {
            return pos.y + 5;   // Adjusted for shorter box
          } else {
            return pos.y - 5;   // Current position for taller box
          }
        })()}
        fontSize="14"
        fill="gray"
      >
        {(() => {
          const text = point.text || 'No description';
          const words = text.split(' ');
          const MAX_LINE_LENGTH = 15;
          
          // Helper function to fit words into a line
          const fitWordsInLine = (words, maxLength) => {
            let line = '';
            let remainingWords = [...words];
            
            while (remainingWords.length > 0) {
              const nextWord = remainingWords[0];
              const testLine = line ? `${line} ${nextWord}` : nextWord;
              
              if (testLine.length <= maxLength) {
                line = testLine;
                remainingWords.shift();
              } else {
                break;
              }
            }
            
            return { line, remainingWords };
          };
          
          const { line: firstLine, remainingWords } = fitWordsInLine(words, MAX_LINE_LENGTH);
          
          if (remainingWords.length === 0) {
            // All words fit on first line
            return firstLine;
          } else {
            // Need second line
            const { line: secondLine, remainingWords: leftover } = fitWordsInLine(remainingWords, MAX_LINE_LENGTH);
            const finalSecondLine = leftover.length > 0 ? `${secondLine}...` : secondLine;
            
            return (
              <>
                <tspan x={pos.x + 30} dy="0">{firstLine}</tspan>
                <tspan x={pos.x + 30} dy="18">{finalSecondLine}</tspan>
              </>
            );
          }
        })()}
      </text>
      
      {/* Color status circles */}
      <g>
        {/* Yellow circle */}
        <circle
          cx={pos.x + 38}
          cy={(() => {
            const text = point.text || 'No description';
            const LINE_LENGTH = 15;
            
            if (text.length <= LINE_LENGTH) {
              return pos.y + 22;  // Higher position for single line
            } else {
              return pos.y + 32;  // Current position for two lines
            }
          })()}
          r="8"
          fill={digitalPoints.has(point.id) ? '#FCD34D' : 'transparent'}
          stroke="#666"
          strokeWidth="1"
        />
        
        {/* Blue circle */}
        <circle
          cx={pos.x + 65}
          cy={(() => {
            const text = point.text || 'No description';
            const LINE_LENGTH = 15;
            
            if (text.length <= LINE_LENGTH) {
              return pos.y + 22;  // Higher position for single line
            } else {
              return pos.y + 32;  // Current position for two lines
            }
          })()}
          r="8"
          fill={bluePoints.has(point.id) ? '#3B82F6' : 'transparent'}
          stroke="#666"
          strokeWidth="1"
        />
      </g>
    </g>
  );
})}

{/* Digital cutout mask */}
{(showDigitalCutout || showAnalyticsCutout || cutoutType === 'both') && (
<g>
<defs>
  <mask id="cutoutMask">
    <rect x="0" y="0" width="100%" height="100%" fill="white" />
    {allPoints.map((point, i) => {
      // Skip if no relevant points
      if (
        cutoutType === 'yellow' && !digitalPoints.has(point.id) ||
        cutoutType === 'blue' && !bluePoints.has(point.id) ||
        cutoutType === 'both' && !(digitalPoints.has(point.id) && bluePoints.has(point.id))
      ) return null;
      
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
  fill={cutoutType === 'yellow' ? '#FCD34D' : 
        cutoutType === 'blue' ? '#3B82F6' : 
        cutoutType === 'both' ? '#22C55E' : 'transparent'}
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
      position: 'fixed',  // Add this
      overflowY: 'hidden',  // Add this
      WebkitOverflowScrolling: 'touch',  // Add this
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>

    <style>{`
        @keyframes slideRight {
          0%, 20% { transform: translateX(0); } /* Stay in place for first 20% of animation (down from 30%) */
          100% { transform: translateX(100%); }
        }

        .dropdown-option {
          transition: background-color 0.2s ease;
        }

        .dropdown-option:hover {
          background-color: #dce8fbff !important; /* Same blue as event inputs */
        }

        .flow-item {
          transition: background-color 0.2s ease;
        }

        .flow-item:hover {
          background-color: #dce8fbff !important; /* Same blue as event inputs */
        }

        .flow-item.active {
          background-color: #000712ff !important; /* Darker blue for selected state */
          color: white !important;
        }

        .flow-dropdown-button {
          transition: background-color 0.2s ease;
        }

        .flow-dropdown-button:hover {
          background-color: #dce8fbff !important;
        }

        .document-title {
          transition: all 0.2s ease;
        }

        .document-title:hover,
        .document-title:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
          background-color: #fafbff !important;
        }

        .event-input {
          transition: all 0.2s ease;
        }

        .event-input:hover {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
          background-color: #fafbff !important;
        }

        @keyframes slideBottom {
          0%, 20% { transform: translateY(0); } /* Stay in place for first 20% of animation (down from 30%) */
          100% { transform: translateY(100%); }
        }

        .rotating-cw-icon {
          transition: transform 0.3s ease;
          transform: rotate(0deg);
        }

        .icon-button:hover .rotating-cw-icon {
          transform: rotate(45deg);
        }

        .rotating-ccw-icon {
          transition: transform 0.3s ease;
          transform: rotate(0deg);
        }

        .icon-button:hover .rotating-ccw-icon {
          transform: rotate(-45deg);
        }

        .icon-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border: 1px solid #848484ff;
          border-radius: 6px;
          background-color: white;
          cursor: pointer;
          transition: background-color 0.2s ease;
          margin: 0px;
          width: 36px;
          height: 36px;
        }

        .icon-button:hover {
          background-color: #f8fafc;
        }

        .icon-button:active {
          background-color: #848484ff;
        }

        .rotation-icon {
          width: 16px;
          height: 16px;
        }

        .icon-button:disabled:hover .rotating-cw-icon {
          transform: rotate(0deg);
        }

        .icon-button:disabled:hover .rotating-ccw-icon {
          transform: rotate(0deg);
        }

        .icon-button:disabled {
          cursor: default;
        }

        .bottom-button {
          height: 60px !important;
          min-width: 0 !important;
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 0.65rem !important;
          padding: 0.25rem !important;
        }

        /* Add this new class */
        .add-event-button:hover {
          background-color: #f3f4f6;
        }

        @media (hover: none) {
          .add-event-button:hover {
            background-color: white !important;
          }
        }

        .bottom-button-circle {
          width: 60px !important;
          height: 60px !important;
          border-radius: 50% !important;  /* This makes it circular */
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 0.65rem !important;
          padding: 0.25rem !important;
          flex: 1 !important;
          min-width: 0 !important;
        }

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
      @keyframes m{0%{background-position:0 0}100%{background-position:20px 0}}
        @keyframes v{0%{background-position:0 0}100%{background-position:0 20px}}
        .r{writing-mode:vertical-rl;transform:rotate(180deg)}
      
@keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  
  .action-sheet-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
  }
  
  .action-sheet {
    background-color: white;
    width: 100%;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    animation: slideUp 0.3s ease-out;
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .action-sheet-header {
    text-align: center;
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
    position: relative;
  }
  
  .action-sheet-title {
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }
  
  .action-sheet-handle {
    width: 36px;
    height: 4px;
    background-color: #d1d5db;
    border-radius: 2px;
    margin: 0 auto 12px auto;
  }
  
  .action-sheet-option {
    width: 100%;
    padding: 1rem 1.5rem;
    text-align: left;
    border: none;
    background-color: white;
    border-bottom: 1px solid #f3f4f6;
    font-size: 16px;
    color: #1f2937;
    transition: background-color 0.2s;
  }
  
  .action-sheet-option:active {
    background-color: #f9fafb;
  }
  
  .action-sheet-option.selected {
    background-color: #dbeafe;
    color: #1d4ed8;
    font-weight: 500;
  }
  
  .action-sheet-option:last-child {
    border-bottom: none;
  }

      `}</style>


{/* Outer white container */}
<div style={{
  background: 'white',
  borderBottom: '1px solid #848484ff',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  width: '100%',
  touchAction: 'none',
  userSelect: 'none',
  zIndex: 100, // Add this line
}}>
  
  {/* FIRST ROW */}
  <div style={{
    padding: '.667rem 2rem .334rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isMobile ? 'center' : 'space-between',
    width: '100%',
  }}>
    
    {/* Left - Flow selector */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      width: '300px',
      justifyContent: 'flex-start'
    }}>
      {!isMobile && (
        <>
          <span style={{ fontSize: '14px', lineHeight: '1' }}>Flow:</span>
          <DesktopFlowDropdown
            flows={flows}
            activeFlowId={activeFlowId}
            onSelectFlow={setActiveFlowId}
            onAddFlow={addNewFlow}
            onDeleteFlow={deleteFlow}
            onRenameFlow={renameFlow}
            onDuplicateFlow={duplicateFlow}
          />
        </>
      )}
    </div>

    {/* Center - Document name + Export */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.75rem',
      flex: isMobile ? 'none' : 1,
      justifyContent: 'center'
    }}>
      <Input 
        type="text"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        placeholder="Drawing Name"
        autoComplete="off"
        className="document-title" // Add this class
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.target.blur(); // This unfocuses the input
          }
        }}
        style={{
          minWidth: '200px',
          maxWidth: '14rem',
          width: '100%',
          textAlign: 'center',
          fontSize: '1rem',
          fontWeight: 600,
          height: '2.25rem',
          padding: '0.25rem',
          border: '.75px solid #000000ff'
        }}
      />

      <Button 
        size="sm" 
        variant="outline" 
        onClick={() => handlePdfExport()}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          height: '2.25rem',
          borderColor: '#848484ff',
        }}
      >
        <Download style={{ width: '1rem', height: '1rem' }}/>
      </Button>
    </div>

    {/* Right - Rotation buttons */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.75rem',
      width: '300px',
      justifyContent: 'flex-end'
    }}>
      {!isMobile && (
        <>
          <button 
            className="icon-button"
            onClick={() => setRotated(false)}
            disabled={!rotated}
            style={{ opacity: !rotated ? 0.5 : 1 }}
          >
            <RotateCcwSquare className="rotating-ccw-icon rotation-icon" />
          </button>
          <button 
            className="icon-button"
            onClick={() => setRotated(true)}
            disabled={rotated}
            style={{ opacity: rotated ? 0.5 : 1 }}
          >
            <RotateCwSquare className="rotating-cw-icon rotation-icon" />
          </button>
        </>
      )}
    </div>
  </div>

  {/* SECOND ROW - Hide entirely on mobile */}
{!isMobile && (
  <div style={{
    padding: '.334rem 2rem .667rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  }}>
  
    {/* Left - Dot/Description count */}
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      width: '300px',
      justifyContent: 'flex-start'
    }}>
      <span style={{ fontSize: '14px', lineHeight: '1' }}>
        {rotated ? (
          `${points.length} events${ghostPoints.length > 0 ? `, ${ghostPoints.length} grey dots` : ''} ${cumulativeType !== 'none' ? ` • \u03A3: ${calculateScores(points).total}` : ''}`
        ) : (
          `${points.length} events${ghostPoints.length > 0 ? `, ${ghostPoints.length} grey dots` : ''} ${cumulativeType !== 'none' ? ` • \u03A3: ${calculateScores(points).total}` : ''}`
        )}
      </span>
    </div>

    {/* Center - Cumulative + Color Cutout */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.75rem', 
      flex: 1,
      justifyContent: 'center'
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '2.25rem' }}>
        <select 
          value={cumulativeType} 
          onChange={(e) => setCumulativeType(e.target.value)}
          style={{
            padding: '0.25rem',
            borderRadius: '0.25rem',
            border: '1px solid #848484ff',
            height: '1.75rem'
          }}
        >
          <option value="none">Cumulative Sum</option>
          <option value="bars">Bars</option>
          <option value="line">Line</option>
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '2.25rem' }}>
        <select 
          value={cutoutType}
          onChange={(e) => {
            const value = e.target.value;
            setCutoutType(value);
            setShowDigitalCutout(value === 'yellow');
            setShowAnalyticsCutout(value === 'blue');
          }}
          style={{
            padding: '0.25rem',
            borderRadius: '0.25rem',
            border: '1px solid #848484ff',
            height: '1.75rem'
          }}
        >
          <option value="none">Colors</option>
          <option value="yellow">Yellow</option>
          <option value="blue">Blue</option>
          <option value="both">Green</option>
        </select>
      </div>
    </div>

    {/* Right - Delete All + Show Points */}
    <div style={{ 
      display: 'flex',
      alignItems: 'center', 
      gap: '0.75rem',
      width: '300px',
      justifyContent: 'flex-end'
    }}>
      {pointsMode === 'delete' && (
        <Button 
          size="sm"
          variant="link"
          onClick={() => {
            setActivePoints([]);
            setActiveDigitalPoints(new Set());
            setActiveBluePoints(new Set());
            setPointsMode('show');
            setEditMode(false);
          }}
          style={{ 
            color: '#ef4444',
            padding: 0,
            margin: 0,
            marginRight: '0.75rem',
            height: 'auto',
            minHeight: 'unset',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Delete All
        </Button>
      )}

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        height: '2.25rem' 
      }}>
        <select 
          value={pointsMode}
          onChange={(e) => {
            const value = e.target.value;
            setPointsMode(value);
            
            if (value === 'show') {
              setShowPoints(true);
              setEditMode(false);
            } else if (value === 'hide') {
              setShowPoints(false);
              setEditMode(false);
            } else if (value === 'delete') {
              setShowPoints(true);
              setEditMode(true);
            }
          }}
          style={{
            padding: '0.25rem',
            borderRadius: '0.25rem',
            border: '1px solid #848484ff',
            height: '1.75rem'
          }}
        >
          <option value="show">Points</option>
          <option value="hide">Hide</option>
          <option value="delete">Delete</option>
        </select>
      </div>
    </div>
  </div>
)}

{/* THIRD ROW - Mobile only */}
{isMobile && (
  <div style={{
    padding: '.5rem 2rem .667rem 2rem',  // Increased top padding from 0 to .5rem
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',     // Changed from center to space-between
    width: '100%',
    minHeight: '2.5rem'                    // Ensures consistent height even when Delete All is hidden
  }}>
    
    {/* Left side - Delete All (only show when in delete mode) */}
    <div style={{ 
      width: '80px',        // Fixed width to prevent layout shift
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'flex-start'
    }}>
      {pointsMode === 'delete' && (
        <Button 
          size="sm"
          variant="link"
          onClick={() => {
            setActivePoints([]);
            setActiveDigitalPoints(new Set());
            setActiveBluePoints(new Set());
            setPointsMode('show');
            setEditMode(false);
          }}
          style={{ 
            color: '#ef4444',
            padding: 0,
            margin: 0,
            height: 'auto',
            minHeight: 'unset',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Delete All
        </Button>
      )}
    </div>

    {/* Center - Dot/Description count */}
    <div style={{ 
      flex: 1,              // Takes remaining space
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center'  // Centers the text
    }}>
      <span style={{ fontSize: '14px', lineHeight: '1' }}>
        {rotated ? (
          `${points.length} events${ghostPoints.length > 0 ? `, ${ghostPoints.length} grey dots` : ''} ${cumulativeType !== 'none' ? ` • \u03A3: ${calculateScores(points).total}` : ''}`
        ) : (
          `${points.length} events${ghostPoints.length > 0 ? `, ${ghostPoints.length} grey dots` : ''} ${cumulativeType !== 'none' ? ` • \u03A3: ${calculateScores(points).total}` : ''}`
        )}
      </span>
    </div>

    {/* Right side - Spacer to balance layout */}
    <div style={{ 
      width: '80px'         // Same width as left side for balance
    }}>
    </div>
  </div>
)}
</div>
              
{rotated ? (
  <div 
    ref={scrollRef}
    style={{
      position: 'relative',
      flex: 1,
      overflowY: 'auto',
      background: '#f9fafb',
      cursor: dragging ? 'ew-resize' : (hoveredPointId || hoveredInsertId) ? 'ew-resize' : 'crosshair',
      height: isMobile ? 
        'calc(100dvh - (env(safe-area-inset-bottom, 1rem) + 4rem))' : // Mobile: account for header and tray
        'calc(100dvh - 80px)'  // Desktop: just account for header
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
        // Less extra space - just enough for the plus button and one more description
        height: isMobile && rotated ? 
          `${(points.length + 2) * (G * 1.5)}px` : 
          `${(points.length + ghostPoints.length + 4) * G}px`

      }}
    >
      <div style={{
        position: 'relative',
        background: 'white',
        borderRight: '1px solid #848484ff',
        flexShrink: 0,
        width: isMobile ? '100%' : `calc(100% - ${H})`,
      // More precise height calculation - just enough for one extra description
        minHeight: isMobile && rotated ? 
    `${(points.length + 2) * (G * 1.5)}px` : 
    'auto'
      }}>
        <div style={{
          position: 'absolute',
          top: isMobile && rotated ? 
            `${(points.length + 1) * (G * 1.5) + (G * 0.2)}px` : // Add extra spacing
            `${getNextX()}px`,
          left: isMobile ? '50%' : '55%',  // Use 50% on mobile, 50% otherwise on vertical
          transform: 'translate(-50%,-50%) rotate(90deg)',
          width: isMobile ? '5rem' : '2.5rem', //Vertical Plus Button Height
          height: isMobile ? '20rem' : '5rem', // Vertical Plus Button Width
          border: '1px solid #848484ff',
          borderRadius: '0.375rem',
          backgroundColor: 'white', // Ensure white background
          zIndex: 5 // Keep above other elements
        }}>

          <Button  
            size="sm"
            variant="ghost"
            onClick={addGhostPoint}
            {...getHoverHandlers('addEvent')}
            style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '0.375rem',
              transition: 'background-color 0.2s',
              fontSize: isMobile ? '1.25rem' : 'inherit',
              backgroundColor: (!isMobile && hoveredButton === 'addEvent') ? '#f3f4f6' : 'white',
            }}
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
                  left: rotated ? '55%' : `${point.x - G/2}px`,
                  top: rotated ? `${point.x - G/2}px` : '50%',
                  transform: 'translate(-50%, -50%)',
                  width: rotated ? '30%' : '40px',
                  height: rotated ? '30px' : '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: hoveredInsertId === point.id ? 1 : 0,
                  cursor: 'pointer',
                  pointerEvents: draggedDescriptionIndex !== null ? 'none' : 'auto',
                  backgroundColor: '#dce8fbff', // Light soft blue
                  borderRadius: '8px', // Rounded corners
                  border: '0px solid rgba(59, 130, 246, 0.2)', // Subtle blue border
                  zIndex: 999
                }}
                onMouseEnter={() => !isMobile && setHoveredInsertId(point.id)}
                onMouseLeave={() => !isMobile && setHoveredInsertId(null)}
                onClick={(e) => handleInsertAt(i, e)} // Pass the event
              >
             <div
               style={{
                 width: '24px',
                 height: '24px',
                 borderRadius: '50%',
                 backgroundColor: '#fff',
                 border: '0px solid #9ca3af',
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
               left: isMobile ? '50%' : '50%',  // Use 50% on mobile, 50% otherwise on vertical
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
               gap: '.75rem', //Gap between all divs inside vertical descriptions section
             }}>
          {/* SECTION 1: Color Dots */}
               <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row', // Column on mobile, row on desktop
                  gap: isMobile ? '.79rem' : '.85rem', // Tighter gap on mobile
                  paddingRight: '.6rem' //Padding between two colored dots and description box vertical
                }}>
                 <div 
                   onClick={() => {
                     setActiveDigitalPoints(prev => {
                       const next = new Set(prev);
                       if (next.has(point.id)) {
                         next.delete(point.id);
                       } else {
                         next.add(point.id);
                       }
                       return next;
                     });
                   }}
                   onMouseEnter={(e) => {
                    if (!digitalPoints.has(point.id)) {
                      e.target.style.backgroundColor = 'rgba(252, 212, 77, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!digitalPoints.has(point.id)) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                   style={{
                     width: isMobile ? '32px' : '24px',    // Bigger on mobile
                     height: isMobile ? '32px' : '24px',   // Bigger on mobile
                     borderRadius: '50%',
                     border: '1px solid #666',
                     backgroundColor: digitalPoints.has(point.id) ? '#FCD34D' : 'transparent',
                     cursor: 'pointer',
                     transition: 'background-color 0.2s'
                   }}
                 />
                 <div 
                   onClick={() => {
                     setActiveBluePoints(prev => {
                       const next = new Set(prev);
                       if (next.has(point.id)) {
                         next.delete(point.id);
                       } else {
                         next.add(point.id);
                       }
                       return next;
                     });
                   }}
                   onMouseEnter={(e) => {
                    if (!bluePoints.has(point.id)) {
                      e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!bluePoints.has(point.id)) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                   style={{
                     width: isMobile ? '32px' : '24px',    // Bigger on mobile
                     height: isMobile ? '32px' : '24px',   // Bigger on mobile
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
                  placeholder={`Event ${i + 1}`}
                  className="event-input" // Add this class
                  style={{
                    width: '270px',
                    height: isMobile ? '5rem' : '2.5rem',
                    border: '1px solid #848484ff',
                    borderRadius: '.8rem'
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
                   e.preventDefault();  // Add this line
                   console.log('📱 Touch Start on description:', { index: i, text: point.text });
                   // Show visual feedback immediately
                   if (hasTouchCapability) {
                     setDraggedDescriptionIndex(i);
                     setDraggedItemId(point.id);
                     setOriginalPoints([...points]);
                     setOriginalIndex(i);
                     toggleScrollLock(true);  // Prevent scrolling while dragging
                   }
                 }}
                 onTouchMove={(e) => {
                   if (!hasTouchCapability || !draggedItemId) return;
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
                   if (!hasTouchCapability) return;
                   
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
                   padding: '0rem', //Gap between drag handle and the other divs inside vertical section
                   color: '#222222ff',
                   transition: 'transform 0.2s, background-color 0.2s',
                   transform: draggedDescriptionIndex === i ? 'scale(0.95)' : draggedOverIndex === i ? 'scale(1.05)' : 'scale(1)',
                   backgroundColor: draggedDescriptionIndex === i ? '#FFF9C4' : draggedOverIndex === i ? '#f3f4f6' : 'transparent',
                   borderRadius: '0.2rem',
                   touchAction: 'none',        // Prevent default touch actions like scrolling
                   overscrollBehavior: 'none', // Prevent bounce/scroll chaining
                   WebkitOverflowScrolling: 'touch' // Better touch scrolling control
                 }}
               >
                <GripVertical size={isMobile ? 20 : 16} /> {/* Bigger icon on mobile */}
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
      display: isMobile ? 'none' : 'block',
      opacity: hideSvgContent ? 0 : 1, // Hide content when flag is true
      transition: 'opacity 0.1s ease', // Smooth transition when coming back
    }}
    className="drawing-area"
    onMouseMove={handleMouseMove}
    onClick={handleClick}
    onMouseEnter={() => setIsHoveringChart(true)}  // Add this
    onMouseLeave={() => setIsHoveringChart(false)} // Add this
    >
    {renderSVG(true)}

    {/* Add Transition Overlay Here */}
      {showTransition && drawingRef.current && ReactDOM.createPortal(
  <div 
    style={{
      position: 'absolute', // Changed from fixed
      top: 0,               // Relative to drawing container
      left: 0,
      width: '100%',        // Full width of drawing container
      height: '100%',       // Full height of drawing container
      backgroundColor: 'white',
      zIndex: 10,           // Just above drawing content
      transformOrigin: transitionDirection === 'right' ? 'left center' : 'center top',
      animation: `${transitionDirection === 'right' ? 'slideRight' : 'slideBottom'} 1000ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
      pointerEvents: 'none'
    }}
  />,
  drawingRef.current // Portal into drawing container, not document.body
)}

    {/* Marching ants code */}
    {!hoveredPointId && !hoveredInsertId && !dragging && !isMobile && !hideAnts && isHoveringChart && (
      <div style={{
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
      }}/>
    )}
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
      cursor: dragging ? 'ns-resize' : (hoveredPointId || hoveredInsertId) ? 'ns-resize' : 'crosshair',
      height: isMobile ? 
        'calc(100dvh - (env(safe-area-inset-bottom, 1rem) + 4rem))' : // Mobile: account for header and tray
        'calc(100dvh - 80px)'  // Desktop: just account for header
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
          height: isMobile ? '100%' : H,
          minHeight: isMobile ? 'initial' : undefined,
          touchAction: dragging ? 'none' : 'pan-x',
          opacity: hideSvgContent ? 0 : 1, // Hide content when flag is true
          transition: 'opacity 1s ease', // Smooth transition when coming back
        }}
        className="drawing-area"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseEnter={() => setIsHoveringChart(true)}  // Add this
  onMouseLeave={() => setIsHoveringChart(false)} // Add this
      >
          {renderSVG(false)}

{/* Add Transition Overlay Here */}
  {showTransition && drawingRef.current && ReactDOM.createPortal(
  <div 
    style={{
      position: 'absolute', // Changed from fixed
      top: 0,               // Relative to drawing container
      left: 0,
      width: '100%',        // Full width of drawing container
      height: '100%',       // Full height of drawing container
      backgroundColor: 'white',
      zIndex: 10,           // Just above drawing content
      transformOrigin: transitionDirection === 'right' ? 'left center' : 'center top',
      animation: `${transitionDirection === 'right' ? 'slideRight' : 'slideBottom'} 1000ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
      pointerEvents: 'none'
    }}
  />,
  drawingRef.current // Portal into drawing container, not document.body
)}

  {/* Marching ants code */}
      {!hoveredPointId && !hoveredInsertId && !dragging && !isMobile && !hideAnts && isHoveringChart && (
        <div style={{
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
        }}/>
      )}
        </div>
          <div style={{
            position: 'relative',
            background: 'white',
            borderTop: '1px solid #848484ff',
            height: `calc(100% - ${H})`,  // This should take remaining space after SVG
            display: isMobile ? 'none' : 'block'
          }}>
            <div style={{    // Add this new div here
              height: '300px',
              position: 'relative',
              overflowY: 'auto',
              background: 'white'
            }}>
              <div style={{
                position: 'absolute',
                left: `${getNextX()}px`,
                top: '50%',
                transform: 'translate(-50%,-50%) rotate(-90deg)',
                width: '5rem', // Horizontal Plus Button Height
                height: '2.5rem',
                border: '1px solid #848484ff',
                borderRadius: '0.375rem'
              }}>
                <Button  
                  size="sm"
                  variant="ghost"
                  onClick={addGhostPoint}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: '0.375rem', // Add this to match the container's border radius
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
                        width: rotated ? '30%' : '30px',
                        height: rotated ? '40px' : '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: hoveredInsertId === point.id ? 1 : 0,
                        backgroundColor: '#dce8fbff', // Light soft blue
                        cursor: 'pointer',
                        pointerEvents: draggedDescriptionIndex !== null ? 'none' : 'auto',
                        borderRadius: '8px', // Rounded corners
                        border: '0px solid rgba(59, 130, 246, 0.2)', // Subtle blue border
                        zIndex: 999
                      }}
                      onMouseEnter={() => !isMobile && setHoveredInsertId(point.id)}
                      onMouseLeave={() => !isMobile && setHoveredInsertId(null)}
                      onClick={(e) => handleInsertAt(i, e)} // Pass the event
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          border: '0px solid #9ca3af',
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
                        backgroundColor: draggedDescriptionIndex === i ? '#FFF9C4' : 'transparent',
                        borderRadius: '0.25rem',

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
                    placeholder={`Event ${i + 1}`}
                    className="r text-center event-input" // Add event-input to existing classes
                    style={{
                      height: '175px',
                      width: '2.5rem',
                      border: '1px solid #848484ff',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    gap: '0.25rem',  // Space between the circles
                  }}>
                    <div 
                      onClick={() => {
                        setActiveDigitalPoints(prev => {
                          const next = new Set(prev);
                          if (next.has(point.id)) {
                            next.delete(point.id);
                          } else {
                            next.add(point.id);
                          }
                          return next;
                        });
                      }}
                      onMouseEnter={(e) => {
                        if (!digitalPoints.has(point.id)) {
                          e.target.style.backgroundColor = 'rgba(252, 212, 77, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!digitalPoints.has(point.id)) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '1px solid #666',
                        backgroundColor: digitalPoints.has(point.id) ? '#FCD34D' : 'transparent', //Yellow
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    />
                    <div 
                      onClick={() => {
                        setActiveBluePoints(prev => {
                          const next = new Set(prev);
                          if (next.has(point.id)) {
                            next.delete(point.id);
                          } else {
                            next.add(point.id);
                          }
                          return next;
                        });
                      }}
                      onMouseEnter={(e) => {
                        if (!bluePoints.has(point.id)) {
                          e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!bluePoints.has(point.id)) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
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
  </div>
  )}

{modalOpen && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    maxHeight: 'none',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    overflow: 'hidden'
  }}
  onKeyDown={(e) => {
    if (e.key === 'Escape') {
      setModalOpen(false);
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.shiftKey) {
      // Cmd+Shift+Enter for Save & Add Another
      e.preventDefault();
      handleSaveAndAddAnother();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      // Cmd+Enter for regular Save
      e.preventDefault();
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
      {/* Header with title and close button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: 0
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '2rem' // Changed from default to 2x larger
        }}>
          Event {editingPoint.index + 1}
        </h2>
        
        {/* Simple X close button */}
        <button
          onClick={() => setModalOpen(false)} // Same as Cancel button
          style={{
            background: 'none',
            border: 'none',
            color: '#000000ff',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px'
          }}
        >
          ×
        </button>
      </div>
      
      <form 
        id="descriptionForm"
        onSubmit={(e) => {
          e.preventDefault();
          handleTextInput(editingPoint.index, editText, editingPoint.point.isGhost);
          setModalOpen(false);
        }}
        style={{ 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem' 
        }}
      >
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          autoFocus={true}
          autoCapitalize="sentences"
          autoCorrect="on"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              handleTextInput(editingPoint.index, editText, editingPoint.point.isGhost);
              setModalOpen(false);
            }
          }}
          style={{
            width: '100%',
            height: isMobile ? '75px' : '100px', 
            padding: '0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid #e2e8f0',
            fontSize: isMobile ? '1.1rem' : 'inherit'
          }}
        />

        {/* Previous/Next section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          color: '#000000ff'
        }}>
          <div>
            <strong>Previous:</strong> {getAdjacentEventNames().previousName}
          </div>
          <div>
            <strong>Next:</strong> {getAdjacentEventNames().nextName}
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          width: '100%'
        }}>
          {/* Row 1 - Save button (full width) */}
          <Button
            type="submit"
            size="sm"
            variant="outline"
            {...getHoverHandlers('save')}
            style={{
              height: isMobile ? '3rem' : undefined,
              width: '100%', // Full width
              fontSize: isMobile ? '1.1rem' : 'inherit',
              backgroundColor: (!isMobile && hoveredButton === 'save') ? '#0056b3' : '#007AFF',
              color: 'white',
              transition: 'background-color 0.2s ease'
            }}
          >
            Save
          </Button>

          {/* Row 2 - Save & Add Another (2/3) + Delete (1/3) */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            width: '100%'
          }}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSaveAndAddAnother}
              {...getHoverHandlers('saveAdd')}
              style={{
                height: isMobile ? '3rem' : undefined,
                width: 'calc(66.67% - 0.25rem)', // 2/3 width minus half the gap
                fontSize: isMobile ? '1.1rem' : 'inherit',
                backgroundColor: (!isMobile && hoveredButton === 'saveAdd') ? '#e6800e' : '#FFA500',
                color: 'white',
                transition: 'background-color 0.2s ease'
              }}
            >
              Save & Add Another
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                // Delete the current point
                const newPoints = points.filter((_, index) => index !== editingPoint.index);
                const updatedPoints = newPoints.map((point, index) => ({
                  ...point,
                  x: (isMobile && rotated) ? (index + 1) * (G * 1.5) : (index + 1) * G
                }));
                setActivePoints(updatedPoints);

                // Force layout recalculation after deletion
                if (containerRef.current) {
                  const newDimension = ((updatedPoints.length + 4) * G);
                  
                  if (!rotated) {
                    containerRef.current.style.width = `${newDimension}px`;
                  } else {
                    containerRef.current.style.height = `${newDimension}px`;
                  }
                  
                  // Force browser to recalculate layout immediately
                  containerRef.current.offsetHeight;
                }

                setModalOpen(false);
              }}
              {...getHoverHandlers('delete')}
              style={{
                height: isMobile ? '3rem' : undefined,
                width: 'calc(33.33% - 0.25rem)', // 1/3 width minus half the gap
                fontSize: isMobile ? '1.1rem' : 'inherit',
                backgroundColor: (!isMobile && hoveredButton === 'delete') ? '#dc2626' : '#ef4444',
                color: 'white',
                transition: 'background-color 0.2s ease'
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </form>
    </div>
  </div>
)}

  {/* Add the BottomTray only for mobile */}
    {isMobile && <BottomTray 
      rotated={rotated} 
      setRotated={setRotated} 
      isMobile={isMobile}
      isPWA={isPWA}  // Add this line
      flows={flows}
      activeFlowId={activeFlowId}
      setActiveFlowId={setActiveFlowId}
      addNewFlow={addNewFlow}
      onDeleteFlow={deleteFlow}
      onRenameFlow={renameFlow}
      // Add these new props:
      cumulativeType={cumulativeType}
      setCumulativeType={setCumulativeType}
      pointsMode={pointsMode}
      setPointsMode={setPointsMode}
      cutoutType={cutoutType}
      setCutoutType={setCutoutType}
      setShowPoints={setShowPoints}
      setEditMode={setEditMode}
      setShowDigitalCutout={setShowDigitalCutout}
      setShowAnalyticsCutout={setShowAnalyticsCutout}
      onDuplicateFlow={duplicateFlow}  // Add this line
    />}
  </div>
  );
};

const BottomTray = ({ 
  rotated, 
  setRotated, 
  isMobile, 
  isPWA,  // Add this line
  flows, 
  activeFlowId, 
  setActiveFlowId, 
  addNewFlow,
  onDeleteFlow,
  onRenameFlow,
  cumulativeType,
  setCumulativeType,
  pointsMode,
  setPointsMode,
  cutoutType,
  setCutoutType,
  setShowPoints,
  setEditMode,
  setShowDigitalCutout,
  setShowAnalyticsCutout,
  onDuplicateFlow,
}) => {
  const [showActionSheet, setShowActionSheet] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null); // Add this

  const getHoverHandlers = (buttonName) => {  // Add this
    if (isMobile) {
      return {};
    }
    return {
      onMouseEnter: () => setHoveredButton(buttonName),
      onMouseLeave: () => setHoveredButton(null)
    };
  };

  const handleCumulativeClick = () => {
    setShowActionSheet('cumulative');
  };

  const handlePointsClick = () => {
    setShowActionSheet('points');
  };

  const handleColorsClick = () => {
    setShowActionSheet('colors');
  };

  const closeActionSheet = () => {
    setShowActionSheet(null);
  };

  const handleCumulativeSelect = (value) => {
    setCumulativeType(value);
    closeActionSheet();
  };

  const handlePointsSelect = (value) => {
    setPointsMode(value);
    if (value === 'show') {
      setShowPoints(true);
      setEditMode(false);
    } else if (value === 'hide') {
      setShowPoints(false);
      setEditMode(false);
    } else if (value === 'delete') {
      setShowPoints(true);
      setEditMode(true);
    }
    closeActionSheet();
  };

  const handleColorsSelect = (value) => {
    setCutoutType(value);
    setShowDigitalCutout(value === 'yellow');
    setShowAnalyticsCutout(value === 'blue');
    closeActionSheet();
  };

  return (
    <>
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #848484ff',
        paddingBottom: isPWA ? '2.5rem' : '0.75rem', // PWA gets extra padding, everything else gets minimal
        backgroundColor: 'white',
        touchAction: 'none',
        userSelect: 'none',
        zIndex: 50
      }}>
        <MobileFlowPills 
          flows={flows}
          activeFlowId={activeFlowId}
          onSelectFlow={setActiveFlowId}
          onAddFlow={addNewFlow}
          onDeleteFlow={onDeleteFlow}
          onRenameFlow={onRenameFlow}
          onDuplicateFlow={onDuplicateFlow}
        />
        
        <div style={{
          padding: '0.5rem 1rem',
          display: 'flex',
          gap: '0.5rem',
          width: '100%',
          alignItems: 'stretch'  // Ensures divider stretches to full height
        }}>
          
          {/* First group - State toggles */}
          <Button 
            size="sm"
            variant="outline"
            className="bottom-button"
            onClick={() => setRotated(true)}
            style={{
              backgroundColor: rotated ? '#3b82f6' : 'white',
              color: rotated ? 'white' : '#1f2937',
              borderColor: rotated ? '#3b82f6' : '#848484ff'
            }}
          >
            <PiListDashesBold style={{ 
              width: '20px', 
              height: '20px', 
              marginBottom: '4px',
              color: rotated ? 'white' : 'inherit'
            }}/>
            Events
          </Button>
          
          <Button 
            size="sm"
            variant="outline"
            className="bottom-button"
            onClick={() => setRotated(false)}
            style={{
              backgroundColor: !rotated ? '#3b82f6' : 'white',
              color: !rotated ? 'white' : '#1f2937',
              borderColor: !rotated ? '#3b82f6' : '#848484ff'
            }}
          >
            <TbChartDots3 style={{ 
              width: '20px', 
              height: '20px', 
              marginBottom: '4px',
              transform: 'rotate(90deg)',
              color: !rotated ? 'white' : 'inherit'
            }}/>
            Chart
          </Button>

          {/* Second group - Action buttons */}
          
          {/* // Sum button */}
          <Button 
            size="sm"
            variant="outline"
            className="bottom-button"
            onClick={handleCumulativeClick}
            style={{
              border: 'none',
              backgroundColor: 'white',
              ':hover': 'none',
              borderBottom: cumulativeType !== 'none' ? '3px solid #3b82f6' : 'none',
              borderRadius: cumulativeType !== 'none' ? '6px 6px 0 0' : '6px', // Keep top corners rounded
            }}
            onMouseEnter={isMobile ? undefined : () => {}}
            onMouseLeave={isMobile ? undefined : () => {}}
          >
            <MdOutlineAutoGraph style={{ width: '20px', height: '20px', marginBottom: '4px' }}/>
            Sum
          </Button>

          <Button 
            size="sm"
            variant="outline"
            className="bottom-button"
            onClick={handlePointsClick}
            style={{
              border: 'none',
              backgroundColor: 'white',
              ':hover': 'none',
              borderBottom: pointsMode !== 'show' ? '3px solid #3b82f6' : 'none',
              borderRadius: pointsMode !== 'show' ? '6px 6px 0 0' : '6px',
            }}
            onMouseEnter={isMobile ? undefined : () => {}}
            onMouseLeave={isMobile ? undefined : () => {}}
          >
            <MdHideSource style={{ width: '20px', height: '20px', marginBottom: '4px' }}/>
            Points
          </Button>

          <Button 
            size="sm"
            variant="outline"
            className="bottom-button"
            onClick={handleColorsClick}
            style={{
              border: 'none',
              backgroundColor: 'white',
              ':hover': 'none',
              borderBottom: cutoutType !== 'none' ? '3px solid #3b82f6' : 'none',
              borderRadius: cutoutType !== 'none' ? '6px 6px 0 0' : '6px',
            }}
            onMouseEnter={isMobile ? undefined : () => {}}
            onMouseLeave={isMobile ? undefined : () => {}}
          >
            <IoMdColorPalette style={{ width: '20px', height: '20px', marginBottom: '4px' }}/>
            Colors
          </Button>

          <Button 
            size="sm"
            variant="outline"
            className="bottom-button"
            disabled={true}
            style={{
              border: 'none',
              backgroundColor: 'white',
              ':hover': 'none',
              opacity: 0.5,
              borderBottom: '1px solid transparent', // Change from 'none' to transparent border
              borderRadius: '6px',
            }}
            onMouseEnter={isMobile ? undefined : () => {}}
            onMouseLeave={isMobile ? undefined : () => {}}
          >
            <MdOutlineSsidChart style={{ width: '20px', height: '20px', marginBottom: '4px' }}/>
            Compare
          </Button>
        </div>
      </div>

      {/* Action Sheet */}
      {showActionSheet && (
        <div className="action-sheet-backdrop" onClick={closeActionSheet}>
          <div className="action-sheet" onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: isPWA ? '2.5rem' : '0.75rem' }}>
            <div className="action-sheet-header">
              <div className="action-sheet-handle"></div>
              <div className="action-sheet-title">
                {showActionSheet === 'cumulative' && 'Cumulative Sum Control'}
                {showActionSheet === 'points' && 'Points Control'}
                {showActionSheet === 'colors' && 'Color Control'}
              </div>
            </div>

            {showActionSheet === 'cumulative' && (
              <div>
                <button 
                  className={`action-sheet-option ${cumulativeType === 'none' ? 'selected' : ''}`}
                  onClick={() => handleCumulativeSelect('none')}
                >
                  Hide Cumulative Sum
                </button>
                <button 
                  className={`action-sheet-option ${cumulativeType === 'bars' ? 'selected' : ''}`}
                  onClick={() => handleCumulativeSelect('bars')}
                >
                  Bars
                </button>
                <button 
                  className={`action-sheet-option ${cumulativeType === 'line' ? 'selected' : ''}`}
                  onClick={() => handleCumulativeSelect('line')}
                >
                  Line
                </button>
              </div>
            )}

            {showActionSheet === 'points' && (
              <div>
                <button 
                  className={`action-sheet-option ${pointsMode === 'show' ? 'selected' : ''}`}
                  onClick={() => handlePointsSelect('show')}
                >
                  Show Points
                </button>
                <button 
                  className={`action-sheet-option ${pointsMode === 'hide' ? 'selected' : ''}`}
                  onClick={() => handlePointsSelect('hide')}
                >
                  Hide Points
                </button>
                <button 
                  className={`action-sheet-option ${pointsMode === 'delete' ? 'selected' : ''}`}
                  onClick={() => handlePointsSelect('delete')}
                >
                  Delete Points
                </button>
              </div>
            )}

            {showActionSheet === 'colors' && (
              <div>
                <button 
                  className={`action-sheet-option ${cutoutType === 'none' ? 'selected' : ''}`}
                  onClick={() => handleColorsSelect('none')}
                >
                  Hide Colors
                </button>
                <button 
                  className={`action-sheet-option ${cutoutType === 'yellow' ? 'selected' : ''}`}
                  onClick={() => handleColorsSelect('yellow')}
                >
                  Yellow
                </button>
                <button 
                  className={`action-sheet-option ${cutoutType === 'blue' ? 'selected' : ''}`}
                  onClick={() => handleColorsSelect('blue')}
                >
                  Blue
                </button>
                <button 
                  className={`action-sheet-option ${cutoutType === 'both' ? 'selected' : ''}`}
                  onClick={() => handleColorsSelect('both')}
                >
                  Both
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InteractiveDrawing;