import * as vscode from 'vscode';
import type { AppLogger } from '../../application/ports/logger';

export class VsCodeOutputLogger implements AppLogger {
  private readonly channel: vscode.OutputChannel;

  constructor(name = 'Story Deck') {
    this.channel = vscode.window.createOutputChannel(name);
  }

  info(message: string): void {
    this.channel.appendLine(`[INFO] ${message}`);
  }

  warn(message: string): void {
    this.channel.appendLine(`[WARN] ${message}`);
  }

  error(message: string): void {
    this.channel.appendLine(`[ERROR] ${message}`);
  }

  show(): void {
    this.channel.show(true);
  }

  dispose(): void {
    this.channel.dispose();
  }
}
