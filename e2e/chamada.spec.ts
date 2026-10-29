// Fluxo do /inc1: professor faz login → Hoje → abre a aula → vê a lista correta → marca a chamada →
// salva o rascunho → finaliza → a coordenação vê o mesmo resultado.
import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "demo-aula-em-dia";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("chamada do professor chega igual à coordenação", async ({ page }) => {
  await expect(async () => {
    await page.goto("/login");
    await expect(page.getByText("Ambiente demonstrativo — sem conexão com Sponte")).toBeVisible();
  }).toPass();

  await login(page, "prof.rafael@horizonte.example");
  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();
  const today = page.getByRole("list", { name: "Aulas de hoje" });
  await today.getByRole("link", { name: /TEENS-2A/ }).click();

  // Diego foi transferido há 3 dias: não aparece na lista de hoje.
  await expect(page.getByRole("heading", { name: /TEENS-2A/ })).toBeVisible();
  const groups = page.getByRole("group");
  await expect(groups).toHaveCount(3);
  for (const name of ["Alice Martins", "Bernardo Lopes", "Camila Freitas"]) {
    await expect(page.getByRole("group", { name })).toBeVisible();
  }
  await expect(page.getByText("Diego Nunes")).toHaveCount(0);

  await page.getByRole("group", { name: "Alice Martins" }).getByLabel("Presente").check();
  await page.getByRole("group", { name: "Bernardo Lopes" }).getByLabel("Ausente").check();
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Rascunho salvo" })).toBeVisible();

  // Finalizar com um aluno sem registro exige confirmação explícita.
  await page.getByRole("button", { name: "Finalizar chamada" }).click();
  await expect(page.getByText("1 aluno(s) continuam como")).toBeVisible();
  await page.getByRole("group", { name: "Camila Freitas" }).getByLabel("Atrasado").check();
  await page.getByLabel("Confirmo finalizar com alunos não registrados").check();
  await page.getByRole("button", { name: "Finalizar mesmo assim" }).click();

  const result = page.getByRole("list", { name: "Resultado da chamada" });
  await expect(result).toBeVisible();
  await expect(result.getByRole("listitem").filter({ hasText: "Alice Martins" })).toContainText("Presente");
  await expect(result.getByRole("listitem").filter({ hasText: "Bernardo Lopes" })).toContainText("Ausente");
  await expect(result.getByRole("listitem").filter({ hasText: "Camila Freitas" })).toContainText("Atrasado");

  await page.getByRole("button", { name: "Sair" }).click();
  await login(page, "coordenacao@horizonte.example");
  await expect(page.getByRole("heading", { name: "Chamadas da unidade" })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "TEENS-2A" });
  await expect(row).toContainText("Finalizada");
  await expect(row).toContainText("Presente: 1");
  await expect(row).toContainText("Ausente: 1");
  await expect(row).toContainText("Atrasado: 1");

  await row.getByRole("link", { name: "TEENS-2A" }).click();
  const coordView = page.getByRole("list", { name: "Resultado da chamada" });
  await expect(coordView.getByRole("listitem").filter({ hasText: "Alice Martins" })).toContainText("Presente");
  await expect(coordView.getByRole("listitem").filter({ hasText: "Bernardo Lopes" })).toContainText("Ausente");
  await expect(coordView.getByRole("listitem").filter({ hasText: "Camila Freitas" })).toContainText("Atrasado");
});

test("professor com duas unidades escolhe a unidade e vê só os dados dela", async ({ page }) => {
  await login(page, "prof.marina@horizonte.example");
  await expect(page.getByRole("heading", { name: "Escolha a unidade" })).toBeVisible();
  await page.locator("form").filter({ hasText: "Bairro Alto" }).getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();
  const today = page.getByRole("list", { name: "Aulas de hoje" });
  await expect(today.getByRole("link")).toHaveCount(1);
  await expect(today).toContainText("TEENS-1C");
});
