import React, { useRef, useEffect, useState, useMemo } from 'react';
import { GraphNode, GraphEdge } from '../../types';

interface NetworkGraphProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// Vector math helper
const vec = {
    add: (v1: any, v2: any) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    sub: (v1: any, v2: any) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    scale: (v: any, s: number) => ({ x: v.x * s, y: v.y * s }),
    len: (v: any) => Math.sqrt(v.x * v.x + v.y * v.y),
    normalize: (v: any) => {
        const l = Math.sqrt(v.x * v.x + v.y * v.y);
        return l === 0 ? { x: 0, y: 0 } : { x: v.x / l, y: v.y / l };
    }
};

export const NetworkGraph = ({ nodes, edges }: NetworkGraphProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [simNodes, setSimNodes] = useState<any[]>([]);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [draggingNode, setDraggingNode] = useState<string | null>(null);

    // Initialize Simulation Position
    useEffect(() => {
        const width = 800;
        const height = 600;
        const centerX = width / 2;
        const centerY = height / 2;

        const initialNodes = nodes.map((n, i) => ({
            ...n,
            x: centerX + Math.cos(i) * 100 + (Math.random() * 50 - 25), 
            y: centerY + Math.sin(i) * 100 + (Math.random() * 50 - 25),
            vx: 0,
            vy: 0
        }));
        
        setSimNodes(initialNodes);
    }, [nodes]);

    // Physics Engine Loop
    useEffect(() => {
        if (simNodes.length === 0) return;

        let animationFrameId: number;
        const width = 800;
        const height = 600;
        const center = { x: width / 2, y: height / 2 };

        // Physics Constants
        const REPULSION = 4000;
        const SPRING_LENGTH = 150;
        const SPRING_STRENGTH = 0.08;
        const CENTER_GRAVITY = 0.02; 
        const DAMPING = 0.82;

        const tick = () => {
            setSimNodes(prevNodes => {
                const newNodes = prevNodes.map(n => ({ ...n }));

                // 1. Node Repulsion
                for (let i = 0; i < newNodes.length; i++) {
                    for (let j = i + 1; j < newNodes.length; j++) {
                        const n1 = newNodes[i];
                        const n2 = newNodes[j];
                        const delta = vec.sub(n1, n2);
                        const dist = vec.len(delta) || 0.1;
                        const force = vec.scale(vec.normalize(delta), REPULSION / (dist * dist));
                        
                        n1.vx += force.x;
                        n1.vy += force.y;
                        n2.vx -= force.x;
                        n2.vy -= force.y;
                    }
                }

                // 2. Edge Attraction (Springs)
                edges.forEach(edge => {
                    const source = newNodes.find(n => n.id === edge.source);
                    const target = newNodes.find(n => n.id === edge.target);
                    if (source && target) {
                        const delta = vec.sub(target, source);
                        const dist = vec.len(delta);
                        const displacement = dist - SPRING_LENGTH;
                        const force = vec.scale(vec.normalize(delta), displacement * SPRING_STRENGTH);

                        source.vx += force.x;
                        source.vy += force.y;
                        target.vx -= force.x;
                        target.vy -= force.y;
                    }
                });

                // 3. Gravity & Update
                newNodes.forEach(node => {
                    // Pull to center
                    const toCenter = vec.sub(center, node);
                    node.vx += toCenter.x * CENTER_GRAVITY;
                    node.vy += toCenter.y * CENTER_GRAVITY;

                    // Apply Velocity & Damping
                    node.vx *= DAMPING;
                    node.vy *= DAMPING;

                    // Update Position (unless dragging)
                    if (node.id !== draggingNode) {
                        node.x += node.vx;
                        node.y += node.vy;
                    }

                    // Wall Constraints
                    const padding = 40;
                    node.x = Math.max(padding, Math.min(width - padding, node.x));
                    node.y = Math.max(padding, Math.min(height - padding, node.y));
                });

                return newNodes;
            });
            animationFrameId = requestAnimationFrame(tick);
        };

        animationFrameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationFrameId);
    }, [edges, draggingNode]);

    // Graph Traversal for highlighting
    const getRelatedNodes = (nodeId: string) => {
        const related = new Set<string>();
        edges.forEach(e => {
            if (e.source === nodeId) related.add(e.target);
            if (e.target === nodeId) related.add(e.source);
        });
        related.add(nodeId);
        return related;
    };

    const relatedSet = useMemo(() => hoveredNode ? getRelatedNodes(hoveredNode) : null, [hoveredNode, edges]);

    // Drag Handlers
    const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation(); // Prevent propagation
        setDraggingNode(nodeId);
    };

    const handleMouseUp = () => {
        setDraggingNode(null);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingNode) {
            const svg = svgRef.current;
            if (!svg) return;
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            // Map screen coords to SVG coords
            const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
            
            setSimNodes(prev => prev.map(n => 
                n.id === draggingNode ? { ...n, x: svgP.x, y: svgP.y, vx: 0, vy: 0 } : n
            ));
        }
    };

    return (
        <div 
            className="w-full h-[600px] bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
        >
            {/* Dark Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-20" 
                style={{ 
                    backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
                    backgroundSize: '40px 40px' 
                }} 
            />

            <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 800 600" className="block relative z-10">
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <linearGradient id="edgeGradient" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
                    </linearGradient>
                </defs>

                {/* Edges */}
                {edges.map((edge, idx) => {
                    const source = simNodes.find(n => n.id === edge.source);
                    const target = simNodes.find(n => n.id === edge.target);
                    if (!source || !target) return null;

                    const isHighlighted = relatedSet && (relatedSet.has(edge.source) && relatedSet.has(edge.target));
                    const isDimmed = relatedSet && !isHighlighted;

                    return (
                        <g key={idx} className={`transition-all duration-300 ${isDimmed ? 'opacity-5' : 'opacity-100'}`}>
                            <line 
                                x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                                stroke={isHighlighted ? "#818cf8" : "#475569"}
                                strokeWidth={isHighlighted ? 3 : 1}
                                strokeDasharray={edge.label ? "none" : "4 2"}
                            />
                            {edge.label && isHighlighted && (
                                <text 
                                    x={(source.x + target.x) / 2} 
                                    y={(source.y + target.y) / 2} 
                                    textAnchor="middle" 
                                    fill="#94a3b8" 
                                    fontSize="10" 
                                    className="bg-black"
                                    dy="-5"
                                >
                                    {edge.label}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Nodes */}
                {simNodes.map((node) => {
                    const isRoot = node.type === 'root';
                    const isHovered = hoveredNode === node.id;
                    const isDimmed = relatedSet && !relatedSet.has(node.id);

                    // Styling based on type
                    const radius = isRoot ? 30 : 20;
                    const color = node.type === 'cause' ? '#f59e0b' : // Amber
                                 node.type === 'effect' ? '#10b981' : // Emerald
                                 node.type === 'root' ? '#6366f1' : // Indigo
                                 '#cbd5e1'; // Slate

                    return (
                        <g 
                            key={node.id} 
                            transform={`translate(${node.x}, ${node.y})`}
                            onMouseDown={(e) => handleMouseDown(e, node.id)}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            className={`transition-opacity duration-300 ${isDimmed ? 'opacity-20' : 'opacity-100'} ${isHovered ? 'z-50 cursor-grabbing' : 'z-20 cursor-grab'}`}
                            style={{ filter: isHovered || isRoot ? 'url(#glow)' : 'none' }}
                        >
                            {/* Outer Halo on Hover */}
                            <circle 
                                r={radius + (isHovered ? 8 : 0)} 
                                fill={color} 
                                fillOpacity="0.2" 
                                className="transition-all duration-300"
                            />

                            {/* Node Body (Glassmorphism) */}
                            <circle 
                                r={radius} 
                                fill={isRoot ? color : '#1e293b'} 
                                stroke={color}
                                strokeWidth={isRoot ? 0 : 2}
                                fillOpacity={isRoot ? 0.9 : 0.6}
                                className="shadow-2xl"
                            />
                            
                            {/* Label */}
                            <foreignObject x={-60} y={-radius / 2} width="120" height={radius}>
                                <div className="w-full h-full flex items-center justify-center text-center pointer-events-none px-1">
                                    <p className={`font-bold leading-tight ${isRoot ? 'text-white' : 'text-slate-200'}`} style={{ fontSize: isRoot ? '12px' : '10px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                        {node.label}
                                    </p>
                                </div>
                            </foreignObject>

                            {/* Type Indicator */}
                            {isHovered && (
                                <foreignObject x={-40} y={radius + 8} width="80" height="20">
                                    <div className="flex justify-center">
                                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-900 bg-white/90 px-2 py-0.5 rounded shadow-lg">
                                            {node.type}
                                        </span>
                                    </div>
                                </foreignObject>
                            )}
                        </g>
                    );
                })}
            </svg>
            
            <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-none">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Central Event</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-amber-500 bg-slate-900"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cause</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-slate-900"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Effect</span>
                </div>
            </div>
        </div>
    );
};