import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { openSkill } from "../src/skills/open/skill";
import { notesSkill } from "../src/skills/notes/skill";
import { BUILTIN_SKILLS } from "../src/skills/registry";

describe("Talkit Execute — Desktop Automation & Skills", () => {
  it("includes notesSkill and openSkill in BUILTIN_SKILLS", () => {
    assert.ok(BUILTIN_SKILLS.some((s) => s.id === "notes"));
    assert.ok(BUILTIN_SKILLS.some((s) => s.id === "open"));
    assert.ok(BUILTIN_SKILLS.some((s) => s.id === "computer"));
  });

  it("validates openUrl to reject dangerous non-http protocols (javascript:, file:, smb:)", async () => {
    const openUrlTool = openSkill.tools.find((t) => t.name === "openUrl");
    assert.ok(openUrlTool);

    const badResult = (await openUrlTool.execute({
      url: "javascript:alert(1)",
    } as any)) as { error?: string };

    assert.ok(badResult.error);
    assert.ok(badResult.error.includes("Only http(s) and mailto URLs are allowed"));

    const badFileResult = (await openUrlTool.execute({
      url: "file:///C:/Windows/System32/cmd.exe",
    } as any)) as { error?: string };
    assert.ok(badFileResult.error);
  });

  it("notesSkill successfully creates, lists, and reads notes", async () => {
    const createTool = notesSkill.tools.find((t) => t.name === "createNote");
    const readTool = notesSkill.tools.find((t) => t.name === "readNote");
    const listTool = notesSkill.tools.find((t) => t.name === "listNotes");

    assert.ok(createTool && readTool && listTool);

    const testTitle = `Talkit Test Note ${Date.now()}`;
    const testContent = "Research paper findings on satellite image classification";

    const createRes = (await createTool.execute({
      title: testTitle,
      content: testContent,
    })) as { ok?: boolean; filename?: string };

    assert.equal(createRes.ok, true);
    assert.ok(createRes.filename);

    const readRes = (await readTool.execute({
      titleOrFilename: createRes.filename!,
    })) as { ok?: boolean; content?: string };

    assert.equal(readRes.ok, true);
    assert.ok(readRes.content?.includes(testContent));

    const listRes = (await listTool.execute({})) as { ok?: boolean; count?: number };
    assert.equal(listRes.ok, true);
    assert.ok((listRes.count ?? 0) >= 1);
  });

  it("executeDirectCommand parses and matches calculator and desktop app intents", async () => {
    const { executeDirectCommand } = await import("../src/main/agent/direct-executor");
    
    const calcRes = await executeDirectCommand("open calculator");
    assert.equal(calcRes.matched, true);
    assert.equal(calcRes.action, "open_app");
    assert.ok(calcRes.reply?.includes("Calculator"));

    const notepadRes = await executeDirectCommand("launch notepad");
    assert.equal(notepadRes.matched, true);
    assert.equal(notepadRes.action, "open_app");
    assert.ok(notepadRes.reply?.includes("Notepad"));

    const webRes = await executeDirectCommand("open youtube.com");
    assert.equal(webRes.matched, true);
    assert.equal(webRes.action, "open_url");

    const nonDirectRes = await executeDirectCommand("write a python script to calculate fibonacci");
    assert.equal(nonDirectRes.matched, false);
  });
});
