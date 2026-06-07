"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { MenuItemSnapshot } from "@taukei/domain";

// ---- Types ----

export interface CartLine {
  item: MenuItemSnapshot;
  quantity: number;
}

export interface CartState {
  lines: CartLine[];
  isOpen: boolean;
}

type CartAction =
  | { type: "ADD_ITEM"; item: MenuItemSnapshot }
  | { type: "REMOVE_ITEM"; itemId: string }
  | { type: "SET_QUANTITY"; itemId: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "OPEN_DRAWER" }
  | { type: "CLOSE_DRAWER" }
  | { type: "TOGGLE_DRAWER" };

interface CartContextValue {
  state: CartState;
  dispatch: Dispatch<CartAction>;
  subtotalCents: number;
  itemCount: number;
}

// ---- Reducer ----

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.lines.find((l) => l.item.id === action.item.id);
      if (existing) {
        return {
          ...state,
          isOpen: true,
          lines: state.lines.map((l) =>
            l.item.id === action.item.id
              ? { ...l, quantity: l.quantity + 1 }
              : l
          ),
        };
      }
      return {
        ...state,
        isOpen: true,
        lines: [...state.lines, { item: action.item, quantity: 1 }],
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        lines: state.lines.filter((l) => l.item.id !== action.itemId),
      };

    case "SET_QUANTITY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          lines: state.lines.filter((l) => l.item.id !== action.itemId),
        };
      }
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.item.id === action.itemId ? { ...l, quantity: action.quantity } : l
        ),
      };
    }

    case "CLEAR_CART":
      return { ...state, lines: [], isOpen: false };

    case "OPEN_DRAWER":
      return { ...state, isOpen: true };

    case "CLOSE_DRAWER":
      return { ...state, isOpen: false };

    case "TOGGLE_DRAWER":
      return { ...state, isOpen: !state.isOpen };

    default:
      return state;
  }
}

// ---- Context ----

const CartContext = createContext<CartContextValue | null>(null);

const initialState: CartState = { lines: [], isOpen: false };

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const subtotalCents = state.lines.reduce(
    (sum, line) => sum + line.item.priceCents * line.quantity,
    0
  );

  const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <CartContext.Provider value={{ state, dispatch, subtotalCents, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
