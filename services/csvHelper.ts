import { TestMetadata, Student, ItemAnalysisResult } from '../types';

const downloadCSV = (csvString: string, filename: string) => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-s-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const escapeCsvCell = (cell: string | number) => {
  const cellStr = String(cell);
  if (cellStr.includes(',')) {
    return `"${cellStr.replace(/"/g, '""')}"`;
  }
  return cellStr;
}

export const generateAndDownloadRawScoreCSV = (
  metadata: TestMetadata,
  students: Student[]
) => {
  let csvContent = '';

  // Metadata
  csvContent += `District,${escapeCsvCell(metadata.district)}\n`;
  csvContent += `PSDS,${escapeCsvCell(metadata.psds)}\n`;
  csvContent += `School,${escapeCsvCell(metadata.school)}\n`;
  csvContent += `School Head,${escapeCsvCell(metadata.schoolHead)}\n`;
  csvContent += `School Year,${escapeCsvCell(metadata.schoolYear)}\n`;
  csvContent += `Title of Examination,${escapeCsvCell(metadata.titleOfExamination)}\n`;
  csvContent += `Subject,${escapeCsvCell(metadata.subject)}\n`;
  csvContent += `Grade Level,${escapeCsvCell(metadata.gradeLevel)}\n`;
  csvContent += `Total Number of Items,${metadata.totalItems}\n`;
  csvContent += `Actual Number of Test Takers,${metadata.testTakers}\n`;
  csvContent += `Section,${escapeCsvCell(metadata.section)}\n`;
  csvContent += `Teacher-In-Charge,${escapeCsvCell(metadata.teacherInCharge)}\n\n`;

  // Headers
  const itemHeaders = Array.from({ length: metadata.totalItems }, (_, i) => `Item ${i + 1}`).join(',');
  csvContent += `No.,Name of Learners,${itemHeaders},Total No. of Correct Answer,Feedback\n`;

  // Student Data
  students.forEach((student, index) => {
    const totalCorrect = student.responses.reduce<number>((sum, val) => sum + val, 0);
    const studentRow = [index + 1, student.name, ...student.studentAnswers, totalCorrect, student.feedback || ''].map(escapeCsvCell).join(',');
    csvContent += `${studentRow}\n`;
  });

  // Totals Row
  const itemTotals = Array(metadata.totalItems).fill(0);
  students.forEach(student => {
    student.responses.forEach((response, i) => {
      if (response === 1) itemTotals[i]++;
    });
  });
  const totalRow = ['', 'TOTAL', ...itemTotals, '', ''].map(escapeCsvCell).join(',');
  csvContent += `${totalRow}\n`;

  downloadCSV(csvContent, 'Raw-Score-Sheet.csv');
};

export const generateAndDownloadAnalysisCSV = (
  metadata: TestMetadata,
  analysisResults: ItemAnalysisResult[]
) => {
  let csvContent = '';

  // Metadata
  csvContent += `District,${escapeCsvCell(metadata.district)}\n`;
  csvContent += `School,${escapeCsvCell(metadata.school)}\n`;
  csvContent += `Title of Examination,${escapeCsvCell(metadata.titleOfExamination)}\n`;
  csvContent += `Subject,${escapeCsvCell(metadata.subject)}\n`;
  csvContent += `Grade Level,${escapeCsvCell(metadata.gradeLevel)}\n`;
  csvContent += `Section,${escapeCsvCell(metadata.section)}\n\n`;

  // Headers
  const headers = [
    'Item Number',
    'Total No. of Learners Who Got the Correct Answer',
    'Total Number of Test Items',
    'Mean Percentage Score',
    'Proficiency Level',
    'Difficulty',
    'Descriptive Interpretation'
  ];
  csvContent += `${headers.join(',')}\n`;

  // Data
  analysisResults.forEach(result => {
    const row = [
      result.itemNumber,
      result.totalCorrect,
      metadata.testTakers,
      `${result.mps.toFixed(2)}%`,
      `${result.mps.toFixed(2)}%`,
      result.difficulty,
      result.interpretation
    ].map(escapeCsvCell).join(',');
    csvContent += `${row}\n`;
  });

  downloadCSV(csvContent, 'Interpretation-of-Item-Analysis.csv');
};