
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { EstimationResult } from "../types";

const BRAND_NAME = "Ajay Projects";
const SUPPORT_EMAIL = "ajay.ai.spoc@gmail.com";
const UPI_ID = "ajay.t.me@icici";

export const generateInvoicePDF = (estimate: EstimationResult, clientName: string, clientPhone: string, taskTitle: string) => {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text(BRAND_NAME, 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Professional Engineering Estimates & Construction Solutions", 105, 26, { align: "center" });
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 32, 190, 32);

  // Invoice Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`INVOICE / ESTIMATE`, 20, 45);
  
  doc.setFontSize(10);
  doc.text(`Date: ${timestamp}`, 140, 45);
  doc.text(`Client: ${clientName}`, 20, 55);
  doc.text(`Phone: ${clientPhone}`, 20, 62);
  doc.text(`Project: ${taskTitle}`, 20, 69);

  // Table
  const tableData = estimate.materials.map((m, index) => [
    index + 1,
    m.name,
    m.quantity,
    `₹${m.unitPrice.toLocaleString()}`,
    `₹${m.totalPrice.toLocaleString()}`
  ]);

  (doc as any).autoTable({
    startY: 80,
    head: [["#", "Material Description", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 80 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30, halign: "right" }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Summary
  doc.setFontSize(11);
  doc.text(`Labor Cost: ₹${estimate.laborCost.toLocaleString()}`, 140, finalY);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Estimate: ₹${estimate.totalEstimatedCost.toLocaleString()}`, 140, finalY + 8);
  
  // Footer / Payment
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Payment Details:", 20, finalY + 25);
  doc.text(`UPI ID: ${UPI_ID}`, 20, finalY + 32);
  doc.text(`Support: ${SUPPORT_EMAIL}`, 20, finalY + 39);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("This is an AI-generated estimate based on 2026 market indices. Final prices may vary.", 105, 285, { align: "center" });

  doc.save(`AjayProjects_Invoice_${clientName.replace(/\s+/g, '_')}.pdf`);
};
