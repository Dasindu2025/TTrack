interface ReportItem {
  totalHours: number;
  eveningHours: number;
  nightHours: number;
}

export function aggregateReport(items: ReportItem[]) {
  return items.reduce(
    (acc, item) => {
      acc.totalHours += item.totalHours;
      acc.eveningHours += item.eveningHours;
      acc.nightHours += item.nightHours;
      return acc;
    },
    { totalHours: 0, eveningHours: 0, nightHours: 0 }
  );
}
