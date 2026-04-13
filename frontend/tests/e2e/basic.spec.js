import { test, expect } from "@playwright/test";

test("home carga y navega a tracking público", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ITCOMMERCE" })).toBeVisible();

  await page.getByRole("link", { name: "Seguimiento público" }).click();
  await expect(page).toHaveURL(/.*\/public\/repair-status/);
  await expect(page.getByRole("heading", { name: "Consulta pública de reparación" })).toBeVisible();
});
