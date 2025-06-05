#!/usr/bin/env node

import { Command } from 'commander';
import { config } from './config';
import { authenticate } from './auth';
import { handleCodebaseQuery } from './commands/query';
import { handleFileEdit } from './commands/edit';
import { handleGitOperations } from './commands/git';
import { handleWebSearch } from './commands/search';

const program = new Command();

program
  .name('claude')
  .description('Claude Code - An agentic coding tool powered by Anthropic\'s Claude')
  .version('1.0.0');

// Basic query command - answers questions about codebase
program
  .command('query')
  .description('Ask questions about your codebase')
  .argument('[question]', 'The question about your codebase')
  .action(async (question) => {
    await authenticate();
    await handleCodebaseQuery(question);
  });

// File editing command
program
  .command('edit')
  .description('Edit files or fix bugs in your codebase')
  .argument('[instruction]', 'What changes to make')
  .action(async (instruction) => {
    await authenticate();
    await handleFileEdit(instruction);
  });

// Git operations command
program
  .command('git')
  .description('Handle git operations like commits, PRs, and merge conflicts')
  .argument('[operation]', 'The git operation to perform')
  .action(async (operation) => {
    await authenticate();
    await handleGitOperations(operation);
  });

// Web search command
program
  .command('search')
  .description('Search documentation and resources from the internet')
  .argument('[query]', 'What to search for')
  .action(async (query) => {
    await authenticate();
    await handleWebSearch(query);
  });

// Default command when no subcommand is provided
program
  .argument('[instruction]', 'What you want Claude to do')
  .action(async (instruction) => {
    await authenticate();
    if (!instruction) {
      // Start interactive mode
      console.log('Starting interactive mode...');
      // TODO: Implement interactive mode
    } else {
      // Try to intelligently handle the instruction
      await handleCodebaseQuery(instruction);
    }
  });

program.parse(); 