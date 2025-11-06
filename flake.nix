{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-25.05-darwin";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShell = pkgs.mkShellNoCC {
          packages = with pkgs; [
            bun
            eslint_d
            prettierd
            typescript-language-server
            emmet-language-server
            (pkgs.writeShellApplication {
              name = "pick-op";
              text = ''
                jj op log --no-graph --no-pager \
                -T 'separate("	", id.short(8), time.start().ago()) ++ "\n"' \
                  | fzf --ansi -d'	' --preview='jj op show --color=always --no-pager -p {1}' \
                  | cut -d'	' -f1
              '';
            })
            (pkgs.writeShellApplication {
              name = "implement-empty-change";
              runtimeInputs = [
                pkgs.jujutsu
                pkgs.moreutils
              ];
              text = ''
                if ! jj status --no-pager >/dev/null 2>&1; then
                  echo "Not a jujutsu repository"
                  exit 1
                fi

                if ! jj log -r '@ & empty()' --no-pager >/dev/null 2>&1 | ifne false; then
                  echo "Current change is not empty"
                  exit 1
                fi

                dir=$(mktemp -d)
                trap 'rm -rf $dir' EXIT

                f="$dir/desc.txt"

                jj show --no-patch --no-pager --template description > "$f"

                claude --permission-mode=acceptEdits -p "Implement the following change.\n\n$(cat "$f")" | tee "$f".out
                cp "$f".out response.md
              '';
            })
          ];

          shellHook = ''
            export ESLINT_USE_FLAT_CONFIG=1
          '';
        };
      }
    );
}
