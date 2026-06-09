import { getGradeLabel, getScoreColor } from "./grading.js";
import { auth } from "./shared.js";
import {
  dashboardData,
  lastDisplayedScorecard,
  scoreHistory,
} from "./state.js";

const TALLANN = {
  green: [127, 173, 65],
  greenDark: [90, 138, 30],
  greenLight: [150, 196, 90],
  charcoal: [33, 41, 52],
  text: [74, 78, 87],
  white: [255, 255, 255],
  lightGray: [245, 245, 245],
  border: [217, 217, 217],
  warning: [212, 160, 23],
  error: [192, 57, 43],
  orange: [225, 112, 85],
};

function pdfHeader(doc, pageW) {
  doc.setFillColor(...TALLANN.charcoal);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setFillColor(...TALLANN.green);
  doc.rect(0, 22, pageW, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TALLANN.white);
  doc.text("Tallann Resources", 14, 14.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Sales Role Play Scorecard", pageW - 14, 14.5, { align: "right" });
}

function pdfFooter(doc, pageW, pageH, pageNum) {
  doc.setDrawColor(...TALLANN.border);
  doc.line(14, pageH - 14, pageW - 14, pageH - 14);
  doc.setFontSize(8);
  doc.setTextColor(...TALLANN.text);
  doc.text("Tallann Resources  |  tallannresources.com", 14, pageH - 8);
  doc.text("Page " + pageNum, pageW - 14, pageH - 8, { align: "right" });
}

function pdfAddPageIfNeeded(doc, y, needed, pageW, pageH, pageNum) {
  if (y + needed > pageH - 22) {
    pdfFooter(doc, pageW, pageH, pageNum.val);
    doc.addPage();
    pageNum.val++;
    pdfHeader(doc, pageW);
    return 34;
  }
  return y;
}

function pdfWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

export function downloadDashboardPDF() {
  if (!dashboardData || dashboardData.length === 0) {
    alert("No data to export.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const pageNum = { val: 1 };

  pdfHeader(doc, pageW);
  let y = 34;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(33, 41, 52);
  doc.text("Team Dashboard Report", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(74, 78, 87);
  doc.text(
    "Generated " +
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    margin,
    y,
  );
  y += 10;

  const users = {};
  dashboardData.forEach((card) => {
    if (!users[card.email]) users[card.email] = [];
    users[card.email].push(card);
  });

  const totalUsers = Object.keys(users).length;
  const totalCalls = dashboardData.length;
  const overallAvg = (
    dashboardData.reduce((s, c) => s + c.overall_score, 0) / totalCalls
  ).toFixed(1);

  doc.setFillColor(33, 41, 52);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
  const stats = [
    { label: "Users", value: String(totalUsers) },
    { label: "Total Calls", value: String(totalCalls) },
    { label: "Avg Score", value: overallAvg + "/10" },
  ];
  const statW = contentW / 3;
  stats.forEach((stat, i) => {
    const cx = margin + statW * i + statW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(127, 173, 65);
    doc.text(stat.value, cx, y + 6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(stat.label, cx, y + 11, { align: "center" });
  });
  y += 20;

  doc.setFillColor(127, 173, 65);
  doc.rect(margin, y, contentW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("User", margin + 3, y + 5);
  doc.text("Calls", margin + 80, y + 5);
  doc.text("Avg", margin + 100, y + 5);
  doc.text("Best", margin + 118, y + 5);
  doc.text("Last Call", margin + 136, y + 5);
  y += 7;

  Object.entries(users).forEach(([email, calls], idx) => {
    const avg = (
      calls.reduce((s, c) => s + c.overall_score, 0) / calls.length
    ).toFixed(1);
    const best = Math.max(...calls.map((c) => c.overall_score));
    const last = calls[0].createdAt;
    const rowH = 7;

    y = pdfAddPageIfNeeded(doc, y, rowH, pageW, pageH, pageNum);
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, contentW, rowH, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(33, 41, 52);
    doc.text(
      email.length > 35 ? email.substring(0, 35) + "..." : email,
      margin + 3,
      y + 5,
    );
    doc.text(String(calls.length), margin + 80, y + 5);

    const avgColor = getScoreColor(Math.round(parseFloat(avg)));
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...avgColor);
    doc.text(avg, margin + 100, y + 5);

    doc.setTextColor(33, 41, 52);
    doc.text(String(best), margin + 118, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(74, 78, 87);
    doc.text(
      last instanceof Date
        ? last.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "",
      margin + 136,
      y + 5,
    );

    y += rowH;
    doc.setDrawColor(217, 217, 217);
    doc.line(margin, y, pageW - margin, y);
  });

  pdfFooter(doc, pageW, pageH, pageNum.val);
  doc.save(
    "Tallann-Team-Dashboard-" + new Date().toISOString().slice(0, 10) + ".pdf",
  );
}

export function downloadScorecardPDF() {
  const data = lastDisplayedScorecard;
  if (!data) {
    alert("No scorecard to download. Complete a practice call first.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const pageNum = { val: 1 };
  let y = 0;

  pdfHeader(doc, pageW);
  y = 34;

  const scoreColor = getScoreColor(data.overall_score);
  doc.setFillColor(...scoreColor);
  doc.roundedRect(margin, y, 30, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...TALLANN.white);
  doc.text(data.overall_score + "/10", margin + 15, y + 12, {
    align: "center",
  });
  doc.setFontSize(8);
  doc.text(data.overall_grade || "", margin + 15, y + 18, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...TALLANN.charcoal);
  doc.text("Cold Call Scorecard", margin + 36, y + 8);
  if (data.createdAt) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TALLANN.text);
    const dateStr = (
      data.createdAt instanceof Date ? data.createdAt : new Date()
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    doc.text(dateStr, margin + 36, y + 14);
  }
  if (auth && auth.currentUser && auth.currentUser.email) {
    doc.setFontSize(9);
    doc.setTextColor(...TALLANN.text);
    doc.text(auth.currentUser.email, margin + 36, y + 20);
  }
  y += 28;

  if (data.summary) {
    doc.setFillColor(...TALLANN.lightGray);
    const summaryLines = doc.splitTextToSize(data.summary, contentW - 10);
    const summaryH = summaryLines.length * 4.5 + 8;
    y = pdfAddPageIfNeeded(doc, y, summaryH, pageW, pageH, pageNum);
    doc.roundedRect(margin, y, contentW, summaryH, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TALLANN.text);
    let sy = y + 5;
    summaryLines.forEach((line) => {
      doc.text(line, margin + 5, sy);
      sy += 4.5;
    });
    y += summaryH + 6;
  }

  if (data.criteria && data.criteria.length > 0) {
    y = pdfAddPageIfNeeded(doc, y, 12, pageW, pageH, pageNum);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...TALLANN.charcoal);
    doc.text("Scoring Criteria", margin, y);
    y += 7;

    data.criteria.forEach((c) => {
      const feedbackLines = doc.splitTextToSize(
        c.feedback || "",
        contentW - 50,
      );
      const blockH = Math.max(16, feedbackLines.length * 4 + 14);
      y = pdfAddPageIfNeeded(doc, y, blockH, pageW, pageH, pageNum);

      doc.setFillColor(...TALLANN.lightGray);
      doc.roundedRect(margin, y, contentW, blockH, 2, 2, "F");

      const barColor = getScoreColor(c.score);
      doc.setFillColor(...barColor);
      doc.roundedRect(margin, y, 3, blockH, 1.5, 1.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...TALLANN.charcoal);
      doc.text(c.name, margin + 7, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...barColor);
      doc.text(
        c.score + "/10 - " + getGradeLabel(c.score),
        pageW - margin - 5,
        y + 6,
        { align: "right" },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...TALLANN.text);
      let fy = y + 12;
      feedbackLines.forEach((line) => {
        doc.text(line, margin + 7, fy);
        fy += 4;
      });

      y += blockH + 3;
    });
    y += 3;
  }

  const halfW = (contentW - 4) / 2;
  if (
    (data.strengths && data.strengths.length) ||
    (data.improvements && data.improvements.length)
  ) {
    y = pdfAddPageIfNeeded(doc, y, 30, pageW, pageH, pageNum);
    const strengthLines = (data.strengths || []).map((s) =>
      doc.splitTextToSize("  " + s, halfW - 10),
    );
    const improveLines = (data.improvements || []).map((s) =>
      doc.splitTextToSize("  " + s, halfW - 10),
    );
    const sH = strengthLines.reduce((sum, l) => sum + l.length * 4 + 1, 0) + 14;
    const iH = improveLines.reduce((sum, l) => sum + l.length * 4 + 1, 0) + 14;
    const boxH = Math.max(sH, iH);
    y = pdfAddPageIfNeeded(doc, y, boxH, pageW, pageH, pageNum);

    doc.setFillColor(232, 245, 220);
    doc.roundedRect(margin, y, halfW, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TALLANN.greenDark);
    doc.text("Strengths", margin + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TALLANN.text);
    let sY = y + 13;
    strengthLines.forEach((lines) => {
      doc.setTextColor(...TALLANN.green);
      doc.text("\u2022", margin + 5, sY);
      doc.setTextColor(...TALLANN.text);
      lines.forEach((l) => {
        doc.text(l, margin + 9, sY);
        sY += 4;
      });
      sY += 1;
    });

    const rightX = margin + halfW + 4;
    doc.setFillColor(255, 243, 224);
    doc.roundedRect(rightX, y, halfW, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TALLANN.orange);
    doc.text("Areas to Improve", rightX + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TALLANN.text);
    let iY = y + 13;
    improveLines.forEach((lines) => {
      doc.setTextColor(...TALLANN.orange);
      doc.text("\u2022", rightX + 5, iY);
      doc.setTextColor(...TALLANN.text);
      lines.forEach((l) => {
        doc.text(l, rightX + 9, iY);
        iY += 4;
      });
      iY += 1;
    });

    y += boxH + 6;
  }

  if (data.coaching_tip) {
    const tipLines = doc.splitTextToSize(data.coaching_tip, contentW - 14);
    const tipH = tipLines.length * 4.5 + 12;
    y = pdfAddPageIfNeeded(doc, y, tipH, pageW, pageH, pageNum);
    doc.setFillColor(...TALLANN.green);
    doc.roundedRect(margin, y, contentW, tipH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TALLANN.white);
    doc.text("Coaching Tip", margin + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let tY = y + 13;
    tipLines.forEach((line) => {
      doc.text(line, margin + 5, tY);
      tY += 4.5;
    });
    y += tipH + 4;
  }

  pdfFooter(doc, pageW, pageH, pageNum.val);
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`Tallann-Scorecard-${dateSlug}.pdf`);
}

export function downloadHistoryPDF() {
  if (!scoreHistory || scoreHistory.length === 0) {
    alert("No call history to download.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const pageNum = { val: 1 };
  let y = 0;

  pdfHeader(doc, pageW);
  y = 34;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...TALLANN.charcoal);
  doc.text("Call History Report", margin, y);
  y += 6;
  if (auth && auth.currentUser && auth.currentUser.email) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TALLANN.text);
    doc.text(
      auth.currentUser.email +
      "  |  Generated " +
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      margin,
      y,
    );
    y += 4;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TALLANN.text);
  doc.text(
    scoreHistory.length +
    " practice call" +
    (scoreHistory.length !== 1 ? "s" : "") +
    " recorded",
    margin,
    y,
  );
  y += 8;

  const scores = scoreHistory.map((s) => s.overall_score);
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  const best = Math.max(...scores);
  const latest = scores[0];

  doc.setFillColor(...TALLANN.charcoal);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, "F");
  const statW = contentW / 3;
  const stats = [
    { label: "Average Score", value: avg + "/10" },
    { label: "Best Score", value: best + "/10" },
    { label: "Most Recent", value: latest + "/10" },
  ];
  stats.forEach((stat, i) => {
    const cx = margin + statW * i + statW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...TALLANN.green);
    doc.text(stat.value, cx, y + 8, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...TALLANN.white);
    doc.text(stat.label, cx, y + 14, { align: "center" });
  });
  y += 24;

  y = pdfAddPageIfNeeded(doc, y, 12, pageW, pageH, pageNum);
  doc.setFillColor(...TALLANN.green);
  doc.rect(margin, y, contentW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...TALLANN.white);
  doc.text("#", margin + 3, y + 5.5);
  doc.text("Date", margin + 14, y + 5.5);
  doc.text("Score", margin + 65, y + 5.5);
  doc.text("Grade", margin + 82, y + 5.5);
  doc.text("Summary", margin + 102, y + 5.5);
  y += 8;

  scoreHistory.forEach((s, i) => {
    const summaryText = s.summary || "";
    const summaryLines = doc.splitTextToSize(summaryText, contentW - 105);
    const rowH = Math.max(7, summaryLines.length * 3.8 + 2);
    y = pdfAddPageIfNeeded(doc, y, rowH + 1, pageW, pageH, pageNum);

    if (i % 2 === 0) {
      doc.setFillColor(...TALLANN.lightGray);
      doc.rect(margin, y, contentW, rowH, "F");
    }

    const scoreColor = getScoreColor(s.overall_score);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TALLANN.charcoal);
    doc.text(String(scoreHistory.length - i), margin + 3, y + 5);

    const dateStr =
      s.createdAt instanceof Date
        ? s.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
        : "";
    doc.text(dateStr, margin + 14, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...scoreColor);
    doc.text(s.overall_score + "/10", margin + 65, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TALLANN.text);
    doc.text(s.overall_grade || "", margin + 82, y + 5);

    doc.setFontSize(7.5);
    doc.setTextColor(...TALLANN.text);
    let sLineY = y + 5;
    summaryLines.forEach((line) => {
      doc.text(line, margin + 102, sLineY);
      sLineY += 3.8;
    });

    y += rowH;
    doc.setDrawColor(...TALLANN.border);
    doc.line(margin, y, pageW - margin, y);
  });

  y += 10;
  scoreHistory.forEach((s, i) => {
    y = pdfAddPageIfNeeded(doc, y, 40, pageW, pageH, pageNum);

    doc.setDrawColor(...TALLANN.green);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    const scoreColor = getScoreColor(s.overall_score);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...TALLANN.charcoal);
    doc.text("Practice Call #" + (scoreHistory.length - i), margin, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...scoreColor);
    doc.text(
      s.overall_score + "/10 - " + (s.overall_grade || ""),
      pageW - margin,
      y,
      { align: "right" },
    );
    y += 5;

    if (s.createdAt instanceof Date) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...TALLANN.text);
      doc.text(
        s.createdAt.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        margin,
        y,
      );
      y += 5;
    }

    if (s.summary) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...TALLANN.text);
      y = pdfWrappedText(doc, s.summary, margin, y + 2, contentW, 4.2);
      y += 3;
    }

    if (s.criteria && s.criteria.length > 0) {
      s.criteria.forEach((c) => {
        y = pdfAddPageIfNeeded(doc, y, 12, pageW, pageH, pageNum);
        const cColor = getScoreColor(c.score);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...TALLANN.charcoal);
        doc.text(c.name, margin + 3, y);
        doc.setTextColor(...cColor);
        doc.text(c.score + "/10", margin + 80, y);
        y += 4;
        if (c.feedback) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...TALLANN.text);
          y = pdfWrappedText(doc, c.feedback, margin + 3, y, contentW - 6, 3.8);
          y += 2;
        }
      });
    }

    if (s.strengths && s.strengths.length) {
      y = pdfAddPageIfNeeded(doc, y, 10, pageW, pageH, pageNum);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...TALLANN.greenDark);
      doc.text("Strengths:", margin + 3, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...TALLANN.text);
      s.strengths.forEach((str) => {
        y = pdfAddPageIfNeeded(doc, y, 6, pageW, pageH, pageNum);
        y = pdfWrappedText(
          doc,
          "\u2022  " + str,
          margin + 5,
          y,
          contentW - 10,
          3.8,
        );
        y += 1;
      });
      y += 2;
    }
    if (s.improvements && s.improvements.length) {
      y = pdfAddPageIfNeeded(doc, y, 10, pageW, pageH, pageNum);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...TALLANN.orange);
      doc.text("Areas to Improve:", margin + 3, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...TALLANN.text);
      s.improvements.forEach((imp) => {
        y = pdfAddPageIfNeeded(doc, y, 6, pageW, pageH, pageNum);
        y = pdfWrappedText(
          doc,
          "\u2022  " + imp,
          margin + 5,
          y,
          contentW - 10,
          3.8,
        );
        y += 1;
      });
      y += 2;
    }

    if (s.coaching_tip) {
      y = pdfAddPageIfNeeded(doc, y, 12, pageW, pageH, pageNum);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...TALLANN.green);
      doc.text("Coaching Tip:", margin + 3, y);
      y += 4;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...TALLANN.text);
      y = pdfWrappedText(
        doc,
        s.coaching_tip,
        margin + 5,
        y,
        contentW - 10,
        3.8,
      );
    }
    y += 10;
  });

  pdfFooter(doc, pageW, pageH, pageNum.val);
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`Tallann-Call-History-${dateSlug}.pdf`);
}

window.downloadDashboardPDF = downloadDashboardPDF;
window.downloadScorecardPDF = downloadScorecardPDF;
window.downloadHistoryPDF = downloadHistoryPDF;
