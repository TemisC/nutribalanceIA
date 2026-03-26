import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WeeklyPlan, DayPlan, Meal } from '../types';

interface ClientMetadata {
    name?: string;
    coachName?: string;
    weight?: string | number;
    goal?: string;
    targetCalories?: number;
}

export const generateMealPlanPDF = (plan: WeeklyPlan, clientInfo?: ClientMetadata) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    // --- HEADER ---
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("Plan Nutricional Personalizado", margin, 18);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generado el: ${dateStr}`, margin, 26);
    doc.text("NutriFit AI Pro", pageWidth - margin - 30, 26);

    // --- METADATA SECTION ---
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.setFontSize(10);

    let yPos = 50;

    const info = [
        clientInfo?.name ? `Cliente: ${clientInfo.name}` : '',
        clientInfo?.coachName ? `Coach: ${clientInfo.coachName}` : '',
        clientInfo?.weight ? `Peso Actual: ${clientInfo.weight} kg` : '',
        clientInfo?.targetCalories ? `Meta Calórica: ~${Math.round(clientInfo.targetCalories)} kcal` : '',
        clientInfo?.goal ? `Objetivo: ${clientInfo.goal.replace('_', ' ').toUpperCase()}` : ''
    ].filter(Boolean);

    // split info into two columns
    const mid = Math.ceil(info.length / 2);
    const leftCol = info.slice(0, mid);
    const rightCol = info.slice(mid);

    leftCol.forEach((text) => {
        doc.text(`• ${text}`, margin, yPos);
        yPos += 6;
    });

    yPos = 50; // reset for right col
    rightCol.forEach((text) => {
        doc.text(`• ${text}`, pageWidth / 2 + 10, yPos);
        yPos += 6;
    });

    yPos += 15; // spacing after metadata

    // --- MEAL TABLES ---

    plan.days.forEach((day: DayPlan) => {
        // Day Header
        // check for page break
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFillColor(241, 245, 249); // Slate 100
        doc.rect(margin, yPos - 6, pageWidth - (margin * 2), 10, 'F');
        doc.setTextColor(16, 185, 129); // Emerald 600
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(day.day, margin + 4, yPos);

        yPos += 10;

        const tableBody = day.meals.map((meal: Meal) => [
            { content: translateMealType(meal.type), styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
            { content: meal.name, styles: { fontStyle: 'bold', textColor: [30, 41, 59] } },
            `${Math.round(meal.calories)} kcal\nP: ${meal.protein}g | C: ${meal.carbs}g | G: ${meal.fats}g`,
            meal.ingredients.join(', ')
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Tipo', 'Plato', 'Macros', 'Ingredientes']],
            body: tableBody,
            margin: { left: margin, right: margin },
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 10 },
            styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 45 },
                2: { cellWidth: 35 },
                3: { cellWidth: 'auto' }
            },
            didDrawPage: (data) => {
                // Footer
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Página ${pageCount}`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: "center" }
                );
            }
        });

        // Update yPos for next loop
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 15;
    });

    // Save
    const fileName = `Plan_${clientInfo?.name || 'NutriFit'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};

function translateMealType(type: string): string {
    switch (type) {
        case 'breakfast': return 'Desayuno';
        case 'lunch': return 'Almuerzo';
        case 'dinner': return 'Cena';
        case 'snack': return 'Snack';
        default: return type;
    }
}
