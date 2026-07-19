import Check from '@mui/icons-material/Check';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import React, { useCallback, useState } from 'react';

import { renderComponent } from 'utils/reactUtils';

export interface ActionSheetItem {
    id?: string | number;
    value?: string | number;
    name?: string;
    secondaryText?: string;
    asideText?: string;
    /** Material icon name; falls back to a check when `selected`. */
    icon?: string;
    selected?: boolean;
    divider?: boolean;
}

export interface ActionSheetOptions {
    items: ActionSheetItem[];
    title?: string;
    /** Anchor element to position the menu near (the button that opened it). */
    positionTo?: Element | null;
}

const itemId = (item: ActionSheetItem): string =>
    String(item.id == null || item.id === '' ? item.value : item.id);

interface ActionSheetProps extends ActionSheetOptions {
    anchorEl: Element | null;
    open: boolean;
    onSelect: (id: string) => void;
    onClose: () => void;
}

// Declarative React action sheet (MUI Menu). The imperative showActionSheet()
// below is the drop-in replacement for the vanilla components/actionSheet.
export function ActionSheet({ items, title, anchorEl, open, onSelect, onClose }: Readonly<ActionSheetProps>) {
    const anySelected = items.some(i => i.selected || i.icon);

    // One stable handler; the chosen id is read from the item's data attribute.
    const handleItemClick = useCallback((e: React.MouseEvent<HTMLLIElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id != null) onSelect(id);
    }, [onSelect]);

    return (
        <Menu
            anchorEl={anchorEl as HTMLElement}
            open={open}
            onClose={onClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            {title && <MenuItem disabled divider>{title}</MenuItem>}
            {items.map((item, i) => {
                if (item.divider) {
                    // eslint-disable-next-line react/no-array-index-key
                    return <Divider key={`divider-${i}`} />;
                }
                const id = itemId(item);
                return (
                    <MenuItem key={id} data-id={id} selected={item.selected} onClick={handleItemClick}>
                        {anySelected && (
                            <ListItemIcon>
                                {(item.selected || item.icon === 'check') ? <Check fontSize='small' /> : null}
                            </ListItemIcon>
                        )}
                        <ListItemText primary={item.name} secondary={item.secondaryText} />
                        {item.asideText && (
                            <span style={{ marginLeft: '1em', opacity: 0.7 }}>{item.asideText}</span>
                        )}
                    </MenuItem>
                );
            })}
        </Menu>
    );
}

// Controlled wrapper that manages open state for the imperative helper.
function ActionSheetHost({ options, resolve }: Readonly<{
    options: ActionSheetOptions;
    resolve: (id: string | null) => void;
}>) {
    const [open, setOpen] = useState(true);

    const finish = useCallback((id: string | null) => {
        setOpen(false);
        // Let the close transition run, then resolve + let the host unmount.
        resolve(id);
    }, [resolve]);

    const onClose = useCallback(() => finish(null), [finish]);

    return (
        <ActionSheet
            items={options.items}
            title={options.title}
            anchorEl={options.positionTo ?? null}
            open={open}
            onSelect={finish}
            onClose={onClose}
        />
    );
}

/**
 * Imperative React action sheet — drop-in for components/actionSheet's show():
 * resolves the chosen item id, or rejects if dismissed. Renders a MUI Menu via
 * renderComponent so legacy/React callers can `await showActionSheet(...)`.
 */
export function showActionSheet(options: ActionSheetOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        let unmount = () => { /* set below */ };
        const cleanup = () => {
            unmount();
            container.remove();
        };

        const done = (id: string | null) => {
            cleanup();
            if (id == null) reject(new Error('ActionSheet closed without resolving'));
            else resolve(id);
        };

        unmount = renderComponent(ActionSheetHost, { options, resolve: done }, container);
    });
}

export default { show: showActionSheet };
