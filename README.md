# Extreme Close-Up

A small app for playing Extreme Close-Up on a video call. Each round, someone screenshares an extreme close-up photo of something in their home. Everyone submits a guess for what it is, the photographer submits the real answer, and the host reveals all the answers at once.

There is no database and there are no dependencies. Everything is kept in memory in one Node process, so it all resets when the server stops.

## Run it

```sh
HOST_KEY=pick-a-secret npm start
```

The server listens on port 8787 (set `PORT` to change it) and prints two links:

- Players: `http://localhost:8787/`
- Host: `http://localhost:8787/?host=<HOST_KEY>`

If you don't set `HOST_KEY`, the server picks a random one and prints it.

To let people outside your network join, put a tunnel in front of it. A Cloudflare quick tunnel needs no account:

```sh
cloudflared tunnel --url http://localhost:8787
```

## How a round works

1. Players open the players link and enter their name once. The name is saved in the browser for the rest of the game.
2. Each player types a guess. The person who took the photo ticks "This is my photo" and types the real answer.
3. After submitting, players see their own answer and who else has submitted, but not what anyone else wrote. They can change their answer until the reveal.
4. The host clicks **Reveal answers**. Everyone sees every answer, with the real answer on top.
5. The host clicks **Start next round**. The finished round moves to the Past rounds list.

**Reset rounds** clears every round and goes back to Round 1. The host link shows the same screens as a player, with the host controls at the bottom, so the host can play too.

Pages check the server for changes every 1.5 seconds.

## Themes

The default look is Pinboard. Add `?theme=deck`, `lens`, `show`, or `case` to the URL to try the others. On the host link, add `&theme=…` instead. The themes are in `themes.css`.
