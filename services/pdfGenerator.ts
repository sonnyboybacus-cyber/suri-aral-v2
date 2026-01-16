import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LessonPlan } from '../types';
import { ConsolidatedData } from './analysisAggregation';

// Clean markdown symbols for cleaner PDF output
const cleanText = (text: string) => {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove Bold
        .replace(/\*(.*?)\*/g, '$1')     // Remove Italic
        .replace(/^#+\s/gm, '')          // Remove Headers
        .replace(/<br\s*\/?>/gi, '\n');  // Replace HTML breaks
};

export const generateLessonPlanPDF = (plan: LessonPlan) => {
    const doc = new jsPDF();

    const margin = 15;
    let y = margin;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    const addText = (text: string, x: number, yPos: number, size: number, weight: 'normal' | 'bold' = 'normal', align: 'left' | 'center' = 'left', maxWidth?: number) => {
        const safeText = cleanText(text);
        doc.setFontSize(size);
        doc.setFont('helvetica', weight);
        if (maxWidth) {
            const lines = doc.splitTextToSize(safeText, maxWidth);
            doc.text(lines, x, yPos, { align });
            return lines.length * (size * 0.45); // Approximate line height
        } else {
            doc.text(safeText, x, yPos, { align });
            return size * 0.45;
        }
    };

    y += addText("Department of Education", pageWidth / 2, y, 12, 'bold', 'center');
    y += 6;
    y += addText("DETAILED LESSON PLAN (DLP)", pageWidth / 2, y, 14, 'bold', 'center');
    y += 10;

    const cellHeight = 8;
    const col1 = margin;
    const col2 = margin + 30;
    const col3 = pageWidth / 2;
    const col4 = col3 + 30;

    doc.setLineWidth(0.1);
    doc.rect(margin, y, contentWidth, cellHeight * 2);
    doc.line(margin, y + cellHeight, pageWidth - margin, y + cellHeight);
    doc.line(pageWidth / 2, y, pageWidth / 2, y + (cellHeight * 2));

    addText("DLP No.:", col1 + 2, y + 5, 10, 'bold');
    addText("1", col2 + 2, y + 5, 10);
    addText("Learning Area:", col3 + 2, y + 5, 10, 'bold');
    addText(plan.learningArea, col4 + 2, y + 5, 10);
    addText("Grade Level:", col1 + 2, y + cellHeight + 5, 10, 'bold');
    addText(plan.gradeLevel, col2 + 2, y + cellHeight + 5, 10);
    addText("Quarter:", col3 + 2, y + cellHeight + 5, 10, 'bold');
    addText(plan.quarter, col4 + 2, y + cellHeight + 5, 10);

    y += (cellHeight * 2) + 5;

    // Build Objectives Content
    let objectivesContent = [];
    if (plan.objectivesKnowledge || plan.objectivesPsychomotor || plan.objectivesAffective) {
        objectivesContent = [
            `A. Content Standards:\n${plan.contentStandards}`,
            `B. Performance Standards:\n${plan.performanceStandards}`,
            `C. Learning Competencies:\n${plan.learningCompetencies}`,
            `D. Objectives:`,
            `   1. Knowledge: ${plan.objectivesKnowledge}`,
            `   2. Psychomotor: ${plan.objectivesPsychomotor}`,
            `   3. Affective: ${plan.objectivesAffective}`
        ];
    } else {
        objectivesContent = [
            `A. Content Standards: ${plan.contentStandards}`,
            `B. Performance Standards: ${plan.performanceStandards}`,
            `C. Learning Competencies: ${plan.learningCompetencies}`,
            `D. Objectives:\n${plan.subTaskedObjectives}`
        ];
    }

    const sections = [
        { title: "I. OBJECTIVES", content: objectivesContent },
        {
            title: "II. CONTENT", content: [
                `Topic: ${plan.topic}`,
                `Concepts:\n${plan.concepts}`
            ]
        },
        {
            title: "III. LEARNING RESOURCES", content: [
                `A. References:`,
                `   1. Teacher's Guide: ${plan.refGuidePages}`,
                `   2. Learner's Material: ${plan.refLearnerPages}`,
                `   3. Textbook: ${plan.refTextbookPages}`,
                `B. Other Resources:\n${plan.otherResources}`
            ]
        },
        {
            title: "IV. PROCEDURES", content: [
                `A. Preparatory Activities:\n${plan.preparatoryActivities}`,
                `B. Presentation:\n${plan.presentation}`,
                `C. Lesson Proper:\n${plan.lessonProper}`,
                `D. Application / Activity:\n${plan.groupActivity}`,
            ]
        },
        { title: "V. ASSESSMENT", content: [plan.assessment] },
        { title: "VI. ASSIGNMENT", content: [plan.assignment] }
    ];

    sections.forEach(section => {
        if (y > 250) { doc.addPage(); y = margin; }

        // Header
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.rect(margin, y, contentWidth, 8, 'S');
        addText(section.title, margin + 2, y + 5.5, 10, 'bold');
        y += 8;

        // Content Body
        section.content.forEach(text => {
            const safeText = cleanText(text || "");
            const fontSize = 10;
            const lineHeight = 5;

            // Split text to lines
            const lines = doc.splitTextToSize(safeText, contentWidth - 4);
            const blockHeight = lines.length * lineHeight;

            // Check page break
            if (y + blockHeight > 275) {
                doc.addPage();
                y = margin;
            }

            // Draw text box border (optional, standard DLP usually has outlines)
            doc.rect(margin, y, contentWidth, blockHeight + 3);

            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'normal');
            doc.text(lines, margin + 2, y + 5);

            y += blockHeight + 3; // Move down
        });
        y += 2; // Small gap between sections
    });

    if (y > 240) { doc.addPage(); y = margin; }
    y += 10;

    addText("Prepared by:", margin, y, 10);
    addText("Noted by:", pageWidth / 2 + margin, y, 10);
    y += 15;

    const preparedByName = (plan.preparedBy || "").toUpperCase();
    addText(preparedByName, margin, y, 10, 'bold');
    doc.line(margin, y + 1, margin + 60, y + 1);
    addText("Teacher", margin, y + 5, 9);

    const notedByName = (plan.notedBy || "PRINCIPAL").toUpperCase();
    addText(notedByName, pageWidth / 2 + margin, y, 10, 'bold');
    doc.line(pageWidth / 2 + margin, y + 1, pageWidth / 2 + margin + 60, y + 1);
    addText("School Head", pageWidth / 2 + margin, y + 5, 9);

    doc.save(`${(plan.topic || "LessonPlan").replace(/\s+/g, '_')}_DLP.pdf`);
};

export const generateDLLPDF = (plan: LessonPlan) => {
    // Landscape Mode for DLL
    const doc = new jsPDF({ orientation: 'landscape' });
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("DAILY LESSON LOG", pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`School: ___________________  Grade Level: ${plan.gradeLevel}`, margin, 25);
    doc.text(`Teacher: ${plan.preparedBy || '___________________'}  Learning Area: ${plan.learningArea}`, margin, 30);
    doc.text(`Teaching Dates: ___________________  Quarter: ${plan.quarter}`, margin, 35);

    const columns = [
        { header: 'Monday', dataKey: 'mon' },
        { header: 'Tuesday', dataKey: 'tue' },
        { header: 'Wednesday', dataKey: 'wed' },
        { header: 'Thursday', dataKey: 'thu' },
        { header: 'Friday', dataKey: 'fri' }
    ];

    if (!plan.dllWeek || plan.dllWeek.length === 0) return;

    // Helper to get day content
    const getDayContent = (index: number, field: keyof typeof plan.dllWeek[0]) => {
        return cleanText(plan.dllWeek![index]?.[field] || "");
    };

    const body = [
        // Objectives
        [
            { content: 'I. OBJECTIVES', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ],
        [
            getDayContent(0, 'objectives'), getDayContent(1, 'objectives'), getDayContent(2, 'objectives'), getDayContent(3, 'objectives'), getDayContent(4, 'objectives')
        ],
        // Content
        [
            { content: 'II. CONTENT', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ],
        [
            getDayContent(0, 'content'), getDayContent(1, 'content'), getDayContent(2, 'content'), getDayContent(3, 'content'), getDayContent(4, 'content')
        ],
        // Resources
        [
            { content: 'III. LEARNING RESOURCES', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ],
        [
            getDayContent(0, 'resources'), getDayContent(1, 'resources'), getDayContent(2, 'resources'), getDayContent(3, 'resources'), getDayContent(4, 'resources')
        ],
        // Procedures
        [
            { content: 'IV. PROCEDURES', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ],
        [
            getDayContent(0, 'procedures'), getDayContent(1, 'procedures'), getDayContent(2, 'procedures'), getDayContent(3, 'procedures'), getDayContent(4, 'procedures')
        ],
        // Remarks
        [
            { content: 'V. REMARKS', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ],
        [
            getDayContent(0, 'remarks'), getDayContent(1, 'remarks'), getDayContent(2, 'remarks'), getDayContent(3, 'remarks'), getDayContent(4, 'remarks')
        ]
    ];

    autoTable(doc, {
        startY: 40,
        head: [columns.map(c => c.header)],
        body: body as any,
        theme: 'grid',
        headStyles: { fillColor: [50, 50, 50], textColor: 255, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' },
        }
    });

    // Signatories
    let y = (doc as any).lastAutoTable.finalY + 15;
    const pageHeight = doc.internal.pageSize.getHeight();

    // Check for page break
    if (y + 30 > pageHeight) {
        doc.addPage();
        y = margin + 10;
    }

    const addText = (text: string, x: number, yPos: number, size: number, weight: 'normal' | 'bold' = 'normal') => {
        doc.setFontSize(size);
        doc.setFont('helvetica', 'normal');
        doc.text(text, x, yPos);
    };

    const notedByX = pageWidth * 0.65; // Position for School Head

    addText("Prepared by:", margin, y, 10);
    addText("Noted by:", notedByX, y, 10);
    y += 15;

    const preparedByName = (plan.preparedBy || "").toUpperCase();
    addText(preparedByName, margin, y, 10, 'bold');
    doc.setLineWidth(0.5);
    doc.line(margin, y + 1, margin + 60, y + 1);
    addText("Teacher", margin, y + 5, 9);

    const notedByName = (plan.notedBy || "PRINCIPAL").toUpperCase();
    addText(notedByName, notedByX, y, 10, 'bold');
    doc.line(notedByX, y + 1, notedByX + 60, y + 1);
    addText("School Head", notedByX, y + 5, 9);

    doc.save(`${(plan.topic || "DLL").replace(/\s+/g, '_')}_Weekly_Log.pdf`);
};

export const generateItemAnalysisReport = (
    metadata: any,
    students: any[],
    analysisResults: any[],
    aiAnalysisReport: string | null
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header Background
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("SURI-ARAL ITEM ANALYSIS REPORT", 14, 13);

    doc.setTextColor(0, 0, 0);
    let y = 35;

    // School & Exam Info
    doc.setFontSize(14);
    doc.text((metadata.school || 'SCHOOL NAME').toUpperCase(), 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Examination: ${metadata.titleOfExamination}`, 14, y);
    y += 5;
    doc.text(`Subject: ${metadata.subject}`, 14, y);
    y += 5;
    doc.text(`Teacher: ${metadata.teacherInCharge}`, 14, y);
    y += 5;
    doc.text(`Grade & Section: ${metadata.gradeLevel} - ${metadata.section}`, 14, y);
    y += 5;
    doc.text(`School Year: ${metadata.schoolYear}`, 14, y);
    y += 5;
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, y);

    // Performance Stats Box
    y += 10;
    const meanScore = (students.reduce((acc, s) => acc + s.responses.reduce((a: number, b: number) => a + b, 0), 0) / (students.length || 1)).toFixed(2);
    const mps = (analysisResults.reduce((acc, r) => acc + r.mps, 0) / (analysisResults.length || 1)).toFixed(2);

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, y, pageWidth - 28, 18, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.text(`Mean Score: ${meanScore}`, 20, y + 11);
    doc.text(`MPS: ${mps}%`, 70, y + 11);
    doc.text(`Students: ${students.length}`, 120, y + 11);
    doc.text(`Items: ${metadata.totalItems}`, 170, y + 11);

    y += 28;

    // Item Analysis Table
    const columns = [
        { header: 'Item', dataKey: 'item' },
        { header: 'Correct', dataKey: 'correct' },
        { header: 'MPS', dataKey: 'mps' },
        { header: 'Difficulty', dataKey: 'diff' },
        { header: 'Interpretation', dataKey: 'interp' },
        { header: 'Competency', dataKey: 'comp' },
    ];

    const rows = analysisResults.map(r => ({
        item: r.itemNumber,
        correct: r.totalCorrect,
        mps: `${r.mps.toFixed(0)}%`,
        diff: r.difficulty,
        interp: r.interpretation,
        comp: r.competency || '-'
    }));

    autoTable(doc, {
        startY: y,
        columns: columns,
        body: rows,
        headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: 50 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
            item: { halign: 'center', cellWidth: 15 },
            correct: { halign: 'center', cellWidth: 20 },
            mps: { halign: 'center', cellWidth: 20 },
            diff: { cellWidth: 25 },
            interp: { cellWidth: 30 },
            comp: { cellWidth: 'auto' }
        }
    });

    // AI Insights Section
    if (aiAnalysisReport) {
        let finalY = (doc as any).lastAutoTable.finalY + 15;
        if (finalY > 230) { doc.addPage(); finalY = 20; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text("AI INSIGHTS & RECOMMENDATIONS", 14, finalY);

        finalY += 8;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        const cleanReport = aiAnalysisReport.replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '');
        const splitText = doc.splitTextToSize(cleanReport, pageWidth - 28);

        if (finalY + (splitText.length * 5) > 280) {
            const linesPerPage = Math.floor((280 - finalY) / 5);
            const firstBlock = splitText.slice(0, linesPerPage);
            const rest = splitText.slice(linesPerPage);

            doc.text(firstBlock, 14, finalY);
            doc.addPage();
            doc.text(rest, 14, 20);
        } else {
            doc.text(splitText, 14, finalY);
        }
    }

    doc.save(`${(metadata.titleOfExamination || 'Analysis').replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf`);
};

export const generateAnswerSheet = (metadata: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const totalItems = metadata.totalItems || 50; // Default to 50 if 0

    // --- 1. Header with Markers (V2.1 - CONCENTRIC FIDUCIALS) ---
    // Detects Concentric Squares (Black-White-Black) for topological certainty
    // Outer: 10mm, Middle: 6mm, Inner: 3mm
    const anchorSize = 10;
    const anchorMargin = 10;

    const drawFiducial = (x: number, y: number) => {
        // Outer Black
        doc.setFillColor(0, 0, 0);
        doc.rect(x, y, anchorSize, anchorSize, 'F');
        // Middle White
        doc.setFillColor(255, 255, 255);
        const midSize = 6;
        const midOffset = (anchorSize - midSize) / 2;
        doc.rect(x + midOffset, y + midOffset, midSize, midSize, 'F');
        // Inner Black
        doc.setFillColor(0, 0, 0);
        const innerSize = 2.5;
        const innerOffset = (anchorSize - innerSize) / 2;
        doc.rect(x + innerOffset, y + innerOffset, innerSize, innerSize, 'F');
    };

    // --- NEW LAYOUT: Markers at 4 Corners (Y=10 to Y=277) ---
    // Top Markers: Y=10 (Top Margin = 10)
    // Bottom Markers: Y=277 (Bottom Margin = 10, Size=10 -> Ends at 287)
    // Grid Starts: Y=80
    const topMarkerY = 10;

    // Top Left
    drawFiducial(anchorMargin, topMarkerY);
    // Top Right
    drawFiducial(pageWidth - anchorMargin - anchorSize, topMarkerY);

    // --- BOTTOM MARKERS ---
    const bottomMarkerY = 277;

    // Bottom Left
    drawFiducial(anchorMargin, bottomMarkerY);
    // Bottom Right
    drawFiducial(pageWidth - anchorMargin - anchorSize, bottomMarkerY);

    // Text Header (unchanged)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text((metadata.school || 'SCHOOL NAME').toUpperCase(), pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const examTitle = metadata.titleOfExamination || 'EXAMINATION TITLE';
    doc.text(examTitle.toUpperCase(), pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`SUBJECT: ${(metadata.subject || '').toUpperCase()}`, pageWidth / 2, 25, { align: 'center' });

    // --- 2. Student Info Block (V2 - GHOST MODE) ---
    const startY = 30;

    doc.setLineWidth(0.3);
    doc.setDrawColor(100);
    doc.setLineDashPattern([2, 1], 0);

    // Name Box
    doc.rect(15, startY, 130, 10);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("NAME:", 17, startY + 6);

    // Date Box
    doc.rect(150, startY, 45, 10);
    doc.text("DATE:", 152, startY + 6);

    // Grade/Sec Box
    doc.rect(15, startY + 14, 80, 10);
    doc.text("GRADE/SEC:", 17, startY + 20);
    if (metadata.gradeLevel || metadata.section) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(`${metadata.gradeLevel || ''} - ${metadata.section || ''}`, 42, startY + 20);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
    }

    // Score Box
    doc.rect(100, startY + 14, 95, 10);
    doc.text("SCORE:", 102, startY + 20);
    doc.setFont('helvetica', 'bold');
    doc.text(`/ ${totalItems}`, 185, startY + 20);
    doc.setFont('helvetica', 'normal');

    // Reset Line Style
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(0);

    // --- 3. Instructions ---
    doc.setTextColor(0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text("INSTRUCTIONS: Fully shade the circle corresponding to your answer. Avoid erasures.", pageWidth / 2, startY + 30, { align: 'center' });

    // --- 4. Answer Grid Optimization (V2) ---
    const itemsPerCol = 25;
    const totalCols = Math.ceil(totalItems / itemsPerCol);

    const bubbleRadius = 2.6;
    const bubbleSpacing = 9;
    const optionCount = 4;

    const rowHeight = 7.6; // 190mm total height for 25 rows

    // Dynamic Centering
    // Visual Width = Offset(10) + (3*9) + Radius~=3 = 40. Margin=2 -> 42.
    // Previous width (48) caused Left-Heavy look (grid centered, but content left in grid).
    const blockWidth = 42;
    const gridGap = 15;
    const totalGridWidth = (totalCols * blockWidth) + ((totalCols - 1) * gridGap);
    const gridStartX = (pageWidth - totalGridWidth) / 2;
    const gridStartY = 80;

    const options = ['A', 'B', 'C', 'D'];

    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.2);

    for (let i = 0; i < totalItems; i++) {
        const colIndex = Math.floor(i / itemsPerCol);
        const rowIndex = i % itemsPerCol;

        if (colIndex > 3) break;

        const xBase = gridStartX + (colIndex * (blockWidth + gridGap));
        const yBase = gridStartY + (rowIndex * rowHeight);

        // Adjust Per-Item Anchor Position for "Exactly Beside" alignment
        // Vertical: Text is ~3mm high above baseline. Center is ~1.5mm up.
        // Rect is 3mm. To center-align:
        // Text Center Y ≈ yBase - 1.5
        // Rect Top Y = Text Center Y - (Height/2) = (yBase - 1.5) - 1.5 = yBase - 3.0
        // We'll use yBase - 2.8 to be safe.
        // Horizontal: Gap of 1.5mm. xBase - 1.5 (end) - 3.0 (width) = xBase - 4.5
        doc.setFillColor(0, 0, 0);
        doc.rect(xBase - 4.5, yBase - 2.8, 3.0, 3.0, 'F');

        // Item Number
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(String(i + 1) + ".", xBase, yBase);

        // Bubbles
        options.forEach((opt, optIdx) => {
            const bubbleX = xBase + 10 + (optIdx * bubbleSpacing);
            const bubbleY = yBase - 1;

            doc.setDrawColor(0);
            doc.circle(bubbleX, bubbleY, bubbleRadius, 'S');

            doc.setTextColor(150, 150, 150);
            doc.setFontSize(6);
            const textWidth = doc.getTextWidth(opt);
            doc.text(opt, bubbleX - (textWidth / 2), bubbleY + 0.8);
        });
    }

    // --- Footer / Signatories ---
    doc.setTextColor(0, 0, 0);
    // Footer Position Logic: Page Height 297mm
    // Bottom Markers: Y=277 to 287mm
    // Signatures Removed

    doc.setFontSize(7);
    doc.setTextColor(150);
    // Add V2 Marker
    doc.text("SURI-ARAL OMR V2 - High Accuracy Template", pageWidth / 2, pageHeight - 5, { align: 'center' });

    doc.save(`${(metadata.titleOfExamination || 'Exam').replace(/\s+/g, '_')}_AnswerSheet_V2.pdf`);
};

export const generateConsolidatedReportPDF = (data: ConsolidatedData, aiInsight?: string | null) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFillColor(79, 70, 229); // Indigo-600
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("DEPARTMENTAL CONSOLIDATED REPORT", 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Suri-Aral Analytics • Generated: ${new Date().toLocaleDateString()}`, 14, 22);

    let y = 35;
    doc.setTextColor(0, 0, 0);

    // --- Exam Info Block ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.examTitle.toUpperCase(), 14, y);
    y += 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.gradeLevel} - ${data.subject}`, 14, y);

    // --- Big Stats ---
    y += 15;
    const statsY = y;
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(14, y, pageWidth - 28, 25, 3, 3, 'FD');

    const drawStat = (label: string, value: string, x: number) => {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(label.toUpperCase(), x, statsY + 8);
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.setFont('helvetica', 'bold');
        doc.text(value, x, statsY + 18);
    };

    drawStat("Overall MPS", `${data.overallMPS.toFixed(2)}%`, 20);
    drawStat("Total Students", data.totalStudents.toString(), 70);
    drawStat("Total Schools", data.schools.length.toString(), 110);
    drawStat("Total Sections", data.totalSections.toString(), 150);

    y += 35;

    // --- 1. School Performance Summary (Table) ---
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text("1. SCHOOL PERFORMANCE SUMMARY", 14, y);
    y += 5;

    const schoolRows = data.schools.map(s => [
        s.name,
        s.totalSections,
        s.totalStudents,
        `${s.mps.toFixed(2)}%`,
        s.mps >= 75 ? 'Mastered' : s.mps >= 50 ? 'Average' : 'Low'
    ]);

    autoTable(doc, {
        startY: y,
        head: [['School Name', 'Sections', 'Students', 'MPS', 'Status']],
        body: schoolRows,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 80 }, // Name
            3: { fontStyle: 'bold' } // MPS
        }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // --- 2. Detailed School Breakdown ---
    if (y > 250) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text("2. SECTION PERFORMANCE (PER SCHOOL)", 14, y);
    y += 10;

    data.schools.forEach((school, idx) => {
        // Check space
        if (y > 240) { doc.addPage(); y = 20; }

        // School Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${school.name} (MPS: ${school.mps.toFixed(2)}%)`, 16, y + 5.5);
        y += 10;

        // Sections Table
        const sectionRows = school.sections.map(sec => [
            sec.name,
            sec.studentCount,
            `${sec.mps.toFixed(2)}%`
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Section Name', 'Students', 'MPS']],
            body: sectionRows,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1, lineColor: 200 },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 20 },
            tableWidth: 150
        });

        y = (doc as any).lastAutoTable.finalY + 8;
    });

    y += 10;

    // --- 3. Least Mastered Skills ---
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text("3. LEAST MASTERED SKILLS (GLOBAL)", 14, y);
    y += 5;

    const poorSkills = data.competencies
        .filter(c => c.mps < 50)
        .sort((a, b) => a.mps - b.mps)
        .slice(0, 10)
        .map(c => [
            `Item ${c.itemNumber}`,
            c.description,
            `${c.mps.toFixed(0)}%`,
            c.interpretation
        ]);

    if (poorSkills.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [['Item', 'Competency', 'MPS', 'Status']],
            body: poorSkills,
            headStyles: { fillColor: [185, 28, 28] }, // Red header
            styles: { fontSize: 8 }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
    } else {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("No least mastered skills identified.", 14, y + 10);
        y += 20;
    }

    // --- 4. AI Insights ---
    if (aiInsight) {
        let finalY = (doc as any).lastAutoTable.finalY + 15;
        if (finalY > 230) { doc.addPage(); finalY = 20; }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text("4. AI DEPARTMENTAL INSIGHTS", 14, finalY);

        finalY += 8;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        const cleanReport = aiInsight.replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '');
        const splitText = doc.splitTextToSize(cleanReport, pageWidth - 28);

        if (finalY + (splitText.length * 5) > 280) {
            const linesPerPage = Math.floor((280 - finalY) / 5);
            const firstBlock = splitText.slice(0, linesPerPage);
            const rest = splitText.slice(linesPerPage);

            doc.text(firstBlock, 14, finalY);
            doc.addPage();
            doc.text(rest, 14, 20);
        } else {
            doc.text(splitText, 14, finalY);
        }
    }

    doc.save(`${(data.examTitle || 'Consolidated_Report').replace(/\s+/g, '_')}.pdf`);
};
