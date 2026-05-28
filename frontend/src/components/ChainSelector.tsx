import { baseSepolia, megaEthTestnet } from "../config/chains";

type Props = {
  selected: number;
  onSelect: (chainId: number) => void;
};

export function ChainSelector({ selected, onSelect }: Props) {
  const chains = [megaEthTestnet, baseSepolia];

  return (
    <div className="segmented" aria-label="Chain selector">
      {chains.map((chain) => (
        <button
          key={chain.id}
          className={selected === chain.id ? "selected" : ""}
          onClick={() => onSelect(chain.id)}
          type="button"
        >
          {chain.name}
        </button>
      ))}
    </div>
  );
}
