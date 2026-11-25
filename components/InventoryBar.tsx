'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [pendingItemIds, setPendingItemIds] = useState<ItemId[] | null>(null);
  const foundItemDialog = useRef<HTMLDialogElement>(null);
  const announcedAvailableItems = useRef(new Set<ItemId>());

  useEffect(() => {
    announcedAvailableItems.current.clear();
  }, [state.runNumbers]);

  useEffect(() => {
    const availableItems = new Set(state.availableItems);
    for (const itemId of announcedAvailableItems.current) {
      if (!availableItems.has(itemId)) {
        announcedAvailableItems.current.delete(itemId);
      }
    }

    const newlyAvailableItems = state.availableItems.filter(
      (itemId) => !announcedAvailableItems.current.has(itemId),
    );
    if (newlyAvailableItems.length === 0) return;

    newlyAvailableItems.forEach((itemId) =>
      announcedAvailableItems.current.add(itemId),
    );
    setPendingItemIds([...state.availableItems]);
  }, [state.availableItems]);

  useEffect(() => {
    if (!pendingItemIds) return;

    const dialog = foundItemDialog.current;
    if (!dialog || dialog.open) return;

    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [pendingItemIds]);

  function reviewFoundItems() {
    if (state.availableItems.length > 0) {
      setPendingItemIds([...state.availableItems]);
    }
  }

  function addPendingItemsToInventory() {
    if (!pendingItemIds) return;

    pendingItemIds.forEach((itemId) => {
      if (state.availableItems.includes(itemId)) {
        dispatch({ type: 'COLLECT_ITEM', itemId });
      }
    });
    foundItemDialog.current?.close();
  }

  return (
    <aside className="inventory-sidebar" aria-label="Inventory">
      <h2 className="inventory-sidebar-title">Inventory</h2>
      <section className="inventory-tray" aria-label="Inventory items">
        <span className="inventory-bag" aria-hidden="true">♧</span>
        {state.inventory.map((itemId) => {
          const selected = selectedItemId === itemId;
          return (
            <button
              key={itemId}
              type="button"
              aria-label={items[itemId].name}
              aria-pressed={selected}
              className={`inventory-slot ${selected ? 'selected-slot' : ''}`}
              onClick={() => onSelectItem(selected ? null : itemId)}
              disabled={state.status !== 'playing'}
            >
              <span className={`item-shape item-${itemId}`} />
              <b>{items[itemId].name}</b>
            </button>
          );
        })}
        {Array.from({ length: Math.max(0, 4 - state.inventory.length) }, (_, index) => (
          <span
            key={`empty-${index}`}
            className="inventory-empty-slot"
            aria-hidden="true"
          />
        ))}
      </section>
      {state.availableItems.length > 0 && (
        <section className="found-items" aria-labelledby="found-items-title">
          <h3 id="found-items-title">Items found</h3>
          <div className="found-items-list">
            {state.availableItems.map((itemId) => (
              <button
                key={itemId}
                type="button"
                className="found-item-button"
                aria-label={`Review found item: ${items[itemId].name}`}
                onClick={reviewFoundItems}
                disabled={state.status !== 'playing'}
              >
                <span className={`item-shape item-${itemId}`} aria-hidden="true" />
                <b>{items[itemId].name}</b>
                <span aria-hidden="true">Review</span>
              </button>
            ))}
          </div>
        </section>
      )}
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
      <dialog
        ref={foundItemDialog}
        className="item-found-dialog"
        aria-labelledby="item-found-title"
        aria-describedby="item-found-message"
        onCancel={(event) => event.preventDefault()}
        onClose={() => setPendingItemIds(null)}
      >
        {pendingItemIds && pendingItemIds.length > 0 && (
          <div className="item-found-content">
            <h2 id="item-found-title">Item found!</h2>
            <div className="item-found-items">
              {pendingItemIds.map((itemId) => (
                <div key={itemId} className="item-found-entry">
                  <span
                    className={`item-shape item-${itemId}`}
                    aria-hidden="true"
                  />
                  <strong>{items[itemId].name}</strong>
                </div>
              ))}
            </div>
            <p id="item-found-message">
              Add {pendingItemIds.length === 1 ? 'this item' : 'these items'} to
              your inventory?
            </p>
            <div className="item-found-actions">
              <button
                type="button"
                className="item-found-continue"
                autoFocus
                onClick={addPendingItemsToInventory}
              >
                Add {pendingItemIds.length === 1 ? 'item' : 'items'} to
                inventory
              </button>
            </div>
          </div>
        )}
      </dialog>
    </aside>
  );
}
