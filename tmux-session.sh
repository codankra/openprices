#!/bin/bash

# Here's an optional script we can use to run all the processes needed to develop locally in one tmux session
SESSION="op"

# Force kill the existing session
tmux kill-session -t $SESSION 2>/dev/null

# Wait a moment to ensure cleanup
sleep 1

# Create new session with nvim in the first window
tmux new-session -d -s $SESSION -n 'nvim'
tmux send-keys -t $SESSION:0 'nvim .' C-m

tmux new-window -t $SESSION:1 -n 'server'
tmux send-keys -t $SESSION:1 'rm -f dev-server.log && npm run dev 2>&1 | tee dev-server.log' C-m

tmux new-window -t $SESSION:2 -n 'tunnel'
tmux send-keys -t $SESSION:2 'cloudflared tunnel --config ./cloudflared.yml run openprice-dev' C-m

tmux new-window -t $SESSION:3 -n 'drizzle'
tmux send-keys -t $SESSION:3 'npx drizzle-kit studio' C-m

# Create window for misc commands
tmux new-window -t $SESSION:4 -n 'shell'

# Select the editor window
tmux select-window -t $SESSION:0

# Attach to session
tmux attach-session -t $SESSION
