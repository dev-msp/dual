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
          ];

          shellHook = ''
            export ESLINT_USE_FLAT_CONFIG=1
          '';
        };
      }
    );
}
