/**
 * EOB board job columns must match how work is tagged in the field and supports
 * legacy `job_status` enum values on databases that have not run the 20260514182000 mapping yet.
 */
export function isEobOngoingStatus(status: string): boolean {
  return status === "Ongoing" || status === "In Progress" || status === "Cross Utilization";
}

export function isEobUpcomingStatus(status: string): boolean {
  return (
    status === "Upcoming" ||
    status === "Bidding" ||
    status === "Tentative" ||
    status === "Confirmed"
  );
}
