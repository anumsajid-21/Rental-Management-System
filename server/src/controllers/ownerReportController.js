import { reportModel } from '../models/reportModel.js';

export function ownerReport(req, res) {
  res.json({
    report: reportModel.summary(req.user.id),
    charts: reportModel.charts(req.user.id),
  });
}
