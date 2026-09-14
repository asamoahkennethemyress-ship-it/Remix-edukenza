import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AnalyticsFullDataset } from '../types/analytics';

export class AnalyticsExporter {
  /**
   * Export PDF Report using jsPDF & autoTable
   */
  static exportToPDF(dataset: AnalyticsFullDataset, schoolName: string = 'EDUkenZA Academy') {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    // Header Title
    doc.setFillColor(0, 33, 71); // EDUkenZA Navy #002147
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(212, 175, 55); // Gold #D4AF37
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('EDUkenZA Enterprise AI Analytics & Predictive Intelligence Report', 14, 16);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`School: ${schoolName}  |  Generated: ${dateStr}  |  Health Score: ${dataset.schoolHealth.overallScore}/100 (${dataset.schoolHealth.rating})`, 14, 26);

    // Section 1: Executive Key Metrics
    doc.setTextColor(0, 33, 71);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Key Performance Indicators & AI Insights', 14, 45);

    const kpiRows = [
      ['School Health Score', `${dataset.schoolHealth.overallScore}/100`, dataset.schoolHealth.rating],
      ['Academic Pass Rate', `${dataset.academic.passRate}%`, `Overall Avg: ${dataset.academic.overallAverage}%`],
      ['Overall Attendance Rate', `${dataset.attendance.overallAttendanceRate}%`, `Present Today: ${dataset.attendance.presentTodayCount}`],
      ['Fee Collection Efficiency', `${dataset.financial.feeCollectionEfficiency}%`, `Collected: R${dataset.financial.totalCollected.toLocaleString()}`],
      ['Predicted Pass Rate', `${dataset.predictions.predictedExamPassRate}%`, `Graduation Prob: ${dataset.predictions.graduationProbability}%`],
      ['Active Risk Alerts', `${dataset.riskAlerts.length} Active Alerts`, 'High Priority Interventions']
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value', 'Status / Detail']],
      body: kpiRows,
      headStyles: { fillColor: [0, 33, 71], textColor: [212, 175, 55], fontStyle: 'bold' },
      theme: 'striped'
    });

    // Section 2: Subject Performance Breakdown
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Academic Subject Mastery Breakdown', 14, currentY);

    const subjectRows = dataset.academic.subjectPerformance.map(s => [
      s.subject,
      `${s.average}%`,
      `${s.passRate}%`,
      `${s.highestScore}%`,
      `${s.lowestScore}%`
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Subject Name', 'Average Score', 'Pass Rate', 'Highest Score', 'Lowest Score']],
      body: subjectRows,
      headStyles: { fillColor: [0, 33, 71], textColor: [255, 255, 255] },
      theme: 'grid'
    });

    // Section 3: AI Predictions & Interventions
    currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('3. AI Early Warnings & Recommended Interventions', 14, currentY);

    const riskRows = dataset.riskAlerts.map(r => [
      r.entityName,
      r.type.toUpperCase().replace('_', ' '),
      r.severity.toUpperCase(),
      r.details,
      r.recommendedIntervention
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Target Entity', 'Alert Type', 'Severity', 'Issue Summary', 'Recommended Action']],
      body: riskRows,
      headStyles: { fillColor: [180, 40, 40], textColor: [255, 255, 255] },
      theme: 'striped'
    });

    // Save File
    doc.save(`EDUkenZA_AI_Analytics_Report_${schoolName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  }

  /**
   * Export Excel Spreadsheet (.xlsx) using SheetJS XLSX
   */
  static exportToExcel(dataset: AnalyticsFullDataset, schoolName: string = 'EDUkenZA Academy') {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Executive Overview
    const summaryData = [
      ['EDUkenZA Enterprise AI Analytics Summary Report'],
      ['School Name', schoolName],
      ['Report Generated Date', new Date().toLocaleString()],
      ['School Health Score', dataset.schoolHealth.overallScore],
      ['School Rating', dataset.schoolHealth.rating],
      [],
      ['Metric', 'Value', 'Unit / Details'],
      ['Overall Academic Average', dataset.academic.overallAverage, '%'],
      ['Academic Pass Rate', dataset.academic.passRate, '%'],
      ['Overall Attendance Rate', dataset.attendance.overallAttendanceRate, '%'],
      ['Total Collected Fees', dataset.financial.totalCollected, 'ZAR'],
      ['Total Outstanding Fees', dataset.financial.totalOutstanding, 'ZAR'],
      ['Fee Collection Efficiency', dataset.financial.feeCollectionEfficiency, '%'],
      ['Predicted Exam Pass Rate', dataset.predictions.predictedExamPassRate, '%'],
      ['Promotion Probability', dataset.predictions.promotionProbability, '%'],
      ['Graduation Probability', dataset.predictions.graduationProbability, '%']
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

    // Sheet 2: Academic Subject Performance
    const academicHeaders = ['Subject', 'Average Score (%)', 'Pass Rate (%)', 'Highest Score (%)', 'Lowest Score (%)'];
    const academicRows = dataset.academic.subjectPerformance.map(s => [
      s.subject, s.average, s.passRate, s.highestScore, s.lowestScore
    ]);
    const wsAcademic = XLSX.utils.aoa_to_sheet([academicHeaders, ...academicRows]);
    XLSX.utils.book_append_sheet(wb, wsAcademic, 'Academic Performance');

    // Sheet 3: Attendance Risk & Trends
    const attendanceHeaders = ['Student ID', 'Student Name', 'Class Name', 'Attendance Rate (%)', 'Consecutive Absences', 'Risk Level'];
    const attendanceRows = dataset.attendance.chronicAbsenteeismRisk.map(a => [
      a.studentId, a.studentName, a.className, a.attendanceRate, a.consecutiveAbsences, a.predictedAbsenceRisk
    ]);
    const wsAttendance = XLSX.utils.aoa_to_sheet([attendanceHeaders, ...attendanceRows]);
    XLSX.utils.book_append_sheet(wb, wsAttendance, 'Attendance Risk');

    // Sheet 4: AI Early Warnings
    const riskHeaders = ['Entity Name', 'Alert Type', 'Severity', 'Details', 'Metric Value', 'Threshold', 'Recommended Action'];
    const riskRows = dataset.riskAlerts.map(r => [
      r.entityName, r.type, r.severity, r.details, r.metricValue, r.threshold, r.recommendedIntervention
    ]);
    const wsRisk = XLSX.utils.aoa_to_sheet([riskHeaders, ...riskRows]);
    XLSX.utils.book_append_sheet(wb, wsRisk, 'Risk Alerts');

    // Write file
    XLSX.writeFile(wb, `EDUkenZA_AI_Analytics_${schoolName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
  }

  /**
   * Export Raw CSV file
   */
  static exportToCSV(dataset: AnalyticsFullDataset, schoolName: string = 'EDUkenZA') {
    let csv = `EDUkenZA AI Analytics Report - ${schoolName}\n`;
    csv += `Generated At,${new Date().toLocaleString()}\n\n`;

    csv += `EXECUTIVE SUMMARY\n`;
    csv += `School Health Score,${dataset.schoolHealth.overallScore}/100\n`;
    csv += `Health Rating,${dataset.schoolHealth.rating}\n`;
    csv += `Academic Average,${dataset.academic.overallAverage}%\n`;
    csv += `Pass Rate,${dataset.academic.passRate}%\n`;
    csv += `Attendance Rate,${dataset.attendance.overallAttendanceRate}%\n`;
    csv += `Fee Efficiency,${dataset.financial.feeCollectionEfficiency}%\n\n`;

    csv += `SUBJECT PERFORMANCE\n`;
    csv += `Subject,Average,Pass Rate,Highest,Lowest\n`;
    dataset.academic.subjectPerformance.forEach(s => {
      csv += `"${s.subject}",${s.average}%,${s.passRate}%,${s.highestScore}%,${s.lowestScore}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `EDUkenZA_AI_Analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Browser Printable Report modal launcher
   */
  static launchPrintableReport(dataset: AnalyticsFullDataset, schoolName: string = 'EDUkenZA Academy') {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EDUkenZA Enterprise AI Analytics Report - ${schoolName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .header { background: #002147; color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
            .header h1 { color: #D4AF37; margin: 0 0 8px 0; font-size: 22px; }
            .header p { margin: 0; opacity: 0.9; font-size: 14px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
            .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
            .kpi-card h3 { margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; }
            .kpi-card .val { font-size: 22px; font-weight: bold; color: #002147; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-size: 13px; }
            th { background: #002147; color: white; font-weight: 600; }
            tr:nth-child(even) { background: #f8fafc; }
            .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px;">
            <button onclick="window.print()" style="background: #002147; color: #D4AF37; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer;">Print Report Now</button>
          </div>
          <div class="header">
            <h1>EDUkenZA Enterprise AI Analytics & Predictive Intelligence</h1>
            <p>School: <strong>${schoolName}</strong> | Date: <strong>${new Date().toLocaleDateString()}</strong> | School Health Score: <strong>${dataset.schoolHealth.overallScore}/100 (${dataset.schoolHealth.rating})</strong></p>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <h3>Academic Pass Rate</h3>
              <div class="val">${dataset.academic.passRate}%</div>
            </div>
            <div class="kpi-card">
              <h3>Attendance Rate</h3>
              <div class="val">${dataset.attendance.overallAttendanceRate}%</div>
            </div>
            <div class="kpi-card">
              <h3>Fee Efficiency</h3>
              <div class="val">${dataset.financial.feeCollectionEfficiency}%</div>
            </div>
            <div class="kpi-card">
              <h3>Predicted Pass Rate</h3>
              <div class="val">${dataset.predictions.predictedExamPassRate}%</div>
            </div>
          </div>

          <h2>Academic Subject Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Average Score</th>
                <th>Pass Rate</th>
                <th>Highest Score</th>
                <th>Lowest Score</th>
              </tr>
            </thead>
            <tbody>
              ${dataset.academic.subjectPerformance.map(s => `
                <tr>
                  <td><strong>${s.subject}</strong></td>
                  <td>${s.average}%</td>
                  <td>${s.passRate}%</td>
                  <td>${s.highestScore}%</td>
                  <td>${s.lowestScore}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>AI Early Warning Risk Alerts</h2>
          ${dataset.riskAlerts.map(r => `
            <div class="alert-box">
              <strong>${r.entityName} (${r.type.toUpperCase()}) - Severity: ${r.severity.toUpperCase()}</strong>
              <p style="margin: 4px 0;">${r.details}</p>
              <div style="font-size: 12px; color: #991b1b;"><strong>Recommended Intervention:</strong> ${r.recommendedIntervention}</div>
            </div>
          `).join('')}

        </body>
      </html>
    `);
    printWindow.document.close();
  }
}
