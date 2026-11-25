'use client';

import { items } from '../data/items';
import type { ItemId } from '../types/game';
import { useGame } from './GameProvider';

interface InventoryBarProps {
  selectedItemId: ItemId | null;
  onSelectItem: (itemId: ItemId | null) => void;
  flashlightOn: boolean;
  onToggleFlashlight: () => void;
}

export function InventoryBar({
  selectedItemId,
  onSelectItem,
  flashlightOn,
  onToggleFlashlight,
}: InventoryBarProps) {
  const { state, dispatch } = useGame();
  const visibleItems = [...state.inventory, ...state.availableItems];

  return (
    <section className="inventory-tray" aria-label="Inventory">
      <span className="inventory-bag" aria-hidden="true">♧</span>
      {visibleItems.map((itemId) => {
        const available = state.availableItems.includes(itemId);
        const selected = selectedItemId === itemId;
        return (
          <button
            key={itemId}
            type="button"
            aria-label={available ? `Collect ${items[itemId].name}` : items[itemId].name}
            aria-pressed={!available && selected}
            className={`inventory-slot ${available ? 'collectible-slot' : ''} ${
              selected ? 'selected-slot' : ''
            }`}
            onClick={() =>
              available
                ? dispatch({ type: 'COLLECT_ITEM', itemId })
                : onSelectItem(selected ? null : itemId)
            }
            disabled={state.status !== 'playing'}
          >
            <span className={`item-shape item-${itemId}`} />
            <b>{items[itemId].name}</b>
          </button>
        );
      })}
      {Array.from({ length: Math.max(0, 4 - visibleItems.length) }, (_, index) => (
        <span
          key={`empty-${index}`}
          className="inventory-empty-slot"
          aria-hidden="true"
        />
      ))}

      {selectedItemId && (
        <div className="item-inspector" role="status">
          <strong>{items[selectedItemId].name}</strong>
          <span>{items[selectedItemId].inspectText}</span>
          {selectedItemId === 'flashlight' && (
            <button
              type="button"
              className="flashlight-toggle"
              aria-pressed={flashlightOn}
              onClick={onToggleFlashlight}
              disabled={state.status !== 'playing'}
            >
              Turn flashlight {flashlightOn ? 'off' : 'on'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
