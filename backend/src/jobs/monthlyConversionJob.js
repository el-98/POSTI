import cron from "node-cron";
import { monthlyPointsToWallet } from "../services/pointsService.js";

export const runMonthlyConversionJob = () => {
  // Ejecuta el primer día de cada mes a las 00:05.
  cron.schedule("5 0 1 * *", async () => {
    await monthlyPointsToWallet();
  });
};
