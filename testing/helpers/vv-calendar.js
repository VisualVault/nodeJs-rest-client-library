/**
 * Calendar-specific helpers for VV date field Playwright tests.
 *
 * These helpers interact with the Kendo calendar widgets used in VV FormViewer:
 *   - kendo-datepicker (date-only, enableTime=false): scrollable month list + day grid
 *   - kendo-datetimepicker (datetime, enableTime=true): infinite scroll calendar + time picker
 *
 * For generic VV form helpers (navigation, field verification, value capture),
 * see ./vv-form.js.
 */

const MONTH_NAMES = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

/**
 * Detect whether a field uses the date-only or datetime picker widget.
 *
 * The [aria-label] container IS the kendo widget element itself:
 *   - Date-only: <kendo-datepicker aria-label="Field7">
 *   - DateTime:  <kendo-datetimepicker aria-label="Field6">
 *
 * @param {import('@playwright/test').Locator} fieldContainer
 * @returns {Promise<'datepicker'|'datetimepicker'>}
 */
async function detectPickerType(fieldContainer) {
    const tagName = await fieldContainer.evaluate((el) => el.tagName.toLowerCase());
    return tagName === 'kendo-datetimepicker' ? 'datetimepicker' : 'datepicker';
}

/**
 * Open the calendar popup for a date field and select a specific day.
 *
 * Handles both date-only (kendo-datepicker) and datetime (kendo-datetimepicker) fields.
 *
 * **Date-only popup**: scrollable month list on the left, day grids on the right.
 * Selection: click month name → click day cell in the target month's tbody.
 *
 * **DateTime popup**: tabbed Date/Time interface with an infinite-scroll calendar.
 * Selection: scroll calendar to target month → click day cell → auto-switches to
 * Time tab (defaults to 12:00 AM) → click Set button.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName - e.g., "Field7" (date-only) or "Field6" (datetime)
 * @param {number} year - e.g., 2026
 * @param {number} month - 1-indexed (1=Jan, 3=Mar, 12=Dec)
 * @param {number} day - day of month (1-31)
 */
async function selectDateViaPopup(page, fieldName, year, month, day) {
    const fieldContainer = page.locator(`[aria-label="${fieldName}"]`);
    await fieldContainer.scrollIntoViewIfNeeded();
    await fieldContainer.waitFor({ state: 'visible', timeout: 10000 });

    const pickerType = await detectPickerType(fieldContainer);

    // VV uses two toggle variants with different structures:
    //   Date-only (kendo-datepicker): <span role="button" aria-label="Toggle calendar">
    //   DateTime (kendo-datetimepicker): <span aria-label="Toggle popup"> (no role="button")
    const toggleBtn = fieldContainer.locator('[aria-label="Toggle calendar"], [aria-label="Toggle popup"]');
    await toggleBtn.waitFor({ state: 'visible', timeout: 10000 });
    await toggleBtn.click();

    if (pickerType === 'datetimepicker') {
        await selectDateInDateTimePicker(page, year, month, day);
    } else {
        await selectDateInDatePicker(page, year, month, day);
    }
}

/**
 * Select a date in the date-only popup (kendo-datepicker).
 *
 * Uses the scrollable month list to navigate, then clicks the day cell
 * within the correct month's tbody section.
 */
async function selectDateInDatePicker(page, year, month, day) {
    const grid = page.locator('[role="grid"]');
    await grid.waitFor({ state: 'visible', timeout: 5000 });

    const targetHeader = `${MONTH_NAMES[month]} ${year}`;
    const monthShort = MONTH_NAMES[month].substring(0, 3);

    // Click the target month in the scrollable month list via page.evaluate().
    // Using DOM-level click avoids Playwright's actionability checks which fail in
    // WebKit when form elements overlap the popup due to z-index stacking differences.
    await page.evaluate(
        ({ monthAbbr }) => {
            const listItems = document.querySelectorAll('[role="grid"] li, .uib-datepicker-popup li');
            for (const li of listItems) {
                if (li.textContent.trim() === monthAbbr) {
                    li.scrollIntoView();
                    li.click();
                    return;
                }
            }
        },
        { monthAbbr: monthShort }
    );

    // Wait for the target month's tbody to appear
    await page.waitForFunction(
        (header) => {
            const tbodies = document.querySelectorAll('[role="grid"] tbody');
            return [...tbodies].some((tb) => {
                const firstRow = tb.querySelector('tr');
                return firstRow && firstRow.textContent.includes(header);
            });
        },
        targetHeader,
        { timeout: 5000 }
    );

    // Click the target day via page.evaluate() — same pattern as selectDateInDateTimePicker.
    // Bypasses Playwright's pointer-event interception checks which fail in WebKit when
    // the popup z-index stacking differs from real Safari.
    const clicked = await page.evaluate(
        ({ targetDay, targetHeader: th }) => {
            const tbodies = document.querySelectorAll('[role="grid"] tbody');
            for (const tbody of tbodies) {
                const firstRow = tbody.querySelector('tr');
                if (!firstRow || !firstRow.textContent.includes(th)) continue;
                const cells = tbody.querySelectorAll('td');
                for (const cell of cells) {
                    if (cell.textContent.trim() === String(targetDay)) {
                        const span = cell.querySelector('span') || cell.querySelector('div');
                        if (span) span.click();
                        else cell.click();
                        return true;
                    }
                }
            }
            return false;
        },
        { targetDay: day, targetHeader }
    );

    if (!clicked) {
        throw new Error(`Could not find day ${day} in ${targetHeader} in date-only calendar popup`);
    }
}

/**
 * Select a date in the DateTime popup (kendo-datetimepicker).
 *
 * The DateTime popup has two tabs: Date (active by default) and Time.
 * The Date tab shows an infinite-scroll Kendo calendar. After clicking a day,
 * it auto-switches to the Time tab (defaults to 12:00 AM). Click Set to confirm.
 *
 * Navigation strategy:
 * 1. Read current header month/year
 * 2. Calculate scroll direction and distance
 * 3. Scroll the calendar virtualization container incrementally
 * 4. Verify header matches target month
 * 5. Click the day cell using page.evaluate for precision (avoids clicking overflow days)
 * 6. Click Set button
 */
async function selectDateInDateTimePicker(page, year, month, day) {
    const popup = page.locator('kendo-popup');
    await popup.waitFor({ state: 'visible', timeout: 5000 });

    const targetHeader = `${MONTH_NAMES[month]} ${year}`;
    const calVirt = popup.locator('.k-datetime-calendar-wrap kendo-virtualization');

    // Scroll one month at a time until the calendar header matches.
    // The virtualized container uses ~230-280px per month row. We scroll
    // conservatively (240px) and re-check after each step to avoid overshooting.
    const STEP_PX = 240;
    const MAX_ATTEMPTS = 36;

    // Calendar header selector: Kendo v1 uses .k-title, v2 uses button.k-calendar-title
    const headerSelector = 'kendo-calendar-header .k-title, kendo-calendar-header button.k-calendar-title';

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const headerText = (await popup.locator(headerSelector).first().textContent()).trim();
        if (headerText === targetHeader) break;

        // Parse current header to determine scroll direction
        const parts = headerText.split(' ');
        const currentMonthName = parts.slice(0, -1).join(' ');
        const currentYearStr = parts[parts.length - 1];
        const currentMonth = MONTH_NAMES.indexOf(currentMonthName);
        const currentYear = parseInt(currentYearStr, 10);
        const currentTotal = currentYear * 12 + currentMonth;
        const targetTotal = year * 12 + month;
        const diff = targetTotal - currentTotal;

        if (diff === 0) break;

        // Scroll one month in the right direction
        const direction = diff > 0 ? 1 : -1;
        await calVirt.evaluate((el, px) => {
            el.scrollTop += px;
        }, direction * STEP_PX);
        await page.waitForTimeout(400);
    }

    // Verify we landed on the right month
    const finalHeader = (await popup.locator(headerSelector).first().textContent()).trim();
    if (finalHeader !== targetHeader) {
        throw new Error(`DateTime popup navigation failed: expected "${targetHeader}", got "${finalHeader}"`);
    }

    // Click the target day within the correct month's <tbody>.
    // The virtualized calendar renders multiple months simultaneously. Each month
    // is a separate <tbody role="rowgroup"> with a header row containing "Month Year".
    // We must find the tbody for the target month, then click the day within it.
    const clicked = await page.evaluate(
        ({ targetDay, targetHeader: th }) => {
            const popup = document.querySelector('kendo-popup');
            const tbodies = popup.querySelectorAll('tbody[role="rowgroup"]');
            for (const tbody of tbodies) {
                const headerRow = tbody.querySelector('tr');
                if (!headerRow || !headerRow.textContent.includes(th)) continue;
                const cells = tbody.querySelectorAll('td[role="gridcell"]');
                for (const cell of cells) {
                    if (cell.textContent.trim() === String(targetDay)) {
                        const span = cell.querySelector('span');
                        if (span) span.click();
                        else cell.click();
                        return true;
                    }
                }
            }
            return false;
        },
        { targetDay: day, targetHeader }
    );

    if (!clicked) {
        throw new Error(`Day ${day} not found in ${targetHeader} tbody of DateTime popup`);
    }

    // After clicking a day, the popup auto-switches to the Time tab.
    // Default time is 12:00 AM — no interaction needed unless a specific time is required.
    // Wait for the Time tab to become active.
    // Kendo v1: button.k-time-tab.k-state-active; v2: button[title="Time tab"][aria-pressed="true"]
    await popup
        .locator('button.k-time-tab.k-state-active, button[title="Time tab"][aria-pressed="true"]')
        .first()
        .waitFor({ state: 'visible', timeout: 3000 });

    // Click Set to confirm the date+time selection
    const setBtn = popup.locator('button.k-time-accept');
    await setBtn.click();

    // Wait for the popup to close
    await popup.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
        // Popup may already be gone
    });
}

/**
 * Type a date segment-by-segment into a date field input.
 *
 * VV date fields use aria-spinbutton inputs that auto-advance between segments
 * (month -> day -> year -> hour -> minute -> AM/PM) as each segment is completed.
 * The segments are separated by / (date) and : or space (time).
 *
 * For enableTime=false fields: pass "MM/dd/yyyy" (e.g., "03/15/2026")
 * For enableTime=true fields: pass "MM/dd/yyyy hh:mm AM" (e.g., "03/15/2026 12:00 AM")
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName - e.g., "Field7"
 * @param {string} dateStr - formatted date string with segments separated by / : or space
 */
async function typeDateInField(page, fieldName, dateStr) {
    const fieldContainer = page.locator(`[aria-label="${fieldName}"]`);
    await fieldContainer.scrollIntoViewIfNeeded();
    // Legacy fields (useLegacy=true) render as a plain <input aria-label="FieldN"> inside div.d-picker.
    // Non-legacy fields render inside a Kendo wrapper (<kendo-datepicker> or <kendo-datetimepicker>)
    // with the aria-label on the wrapper and the input nested inside.
    const tagName = await fieldContainer.evaluate((el) => el.tagName.toLowerCase());
    const isLegacyInput = tagName === 'input';
    const input = isLegacyInput ? fieldContainer : fieldContainer.locator('input').first();

    if (isLegacyInput) {
        // Legacy fields (useLegacy=true) use a plain text <input> — no spinbutton segments.
        // Clear and fill with the full date string, then Tab to trigger blur processing.
        await input.fill(dateStr);
        await page.keyboard.press('Tab');
    } else {
        // Kendo fields: type each segment individually.
        // vvdemo uses Kendo v1 (role="spinbutton", auto-advances segments).
        // vv5dev uses Kendo v2 (role="combobox", DateTimePicker may render without time segments).
        await input.click();

        // Detect whether time segments are rendered by checking the placeholder.
        const placeholder = (await input.getAttribute('placeholder')) || '';
        const hasTimeSegments = placeholder.includes('hh') || placeholder.includes('mm');

        // Strip time portions from the input if the field doesn't render time segments.
        // DateTime fields on newer Kendo (vv5dev) show date-only despite enableTime=true.
        let effectiveDateStr = dateStr;
        if (!hasTimeSegments) {
            effectiveDateStr = dateStr.replace(/\s+\d{1,2}:\d{2}\s*(AM|PM)?$/i, '');
        }

        const parts = effectiveDateStr.split(/[/ :]/);
        for (const part of parts) {
            await page.keyboard.type(part);
        }
        // Tab out to trigger VV's value processing (save handler runs on blur).
        await page.keyboard.press('Tab');
    }

    // Wait for the field's value to be processed by VV instead of using an arbitrary timeout.
    // VV processes the value on blur — poll until the raw value is set.
    await page.waitForFunction(
        (name) => {
            const val = VV.Form.VV.FormPartition.getValueObjectValue(name);
            return val !== null && val !== undefined && val !== '';
        },
        fieldName,
        { timeout: 5000 }
    );
}

/**
 * Open the legacy calendar popup for a useLegacy=true field and select a specific day.
 *
 * Legacy fields render as `<div class="d-picker"><input><span class="cal-icon"></span></div>`.
 * Clicking the cal-icon opens a Kendo calendar popup (same widget as non-legacy fields,
 * just with a different toggle mechanism). Date-only and DateTime legacy fields both use
 * this pattern — the popup closes immediately on day click without a Time tab.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName - e.g., "Field12" (Config E)
 * @param {number} year - e.g., 2026
 * @param {number} month - 1-indexed (1=Jan, 3=Mar, 12=Dec)
 * @param {number} day - day of month (1-31)
 */
async function selectDateViaLegacyPopup(page, fieldName, year, month, day) {
    // Legacy fields use a plain <input id="FieldN"> inside div.d-picker.
    // The toggle is a <span class="k-icon k-i-calendar cal-icon"> sibling.
    const clicked = await page.evaluate((name) => {
        const input = document.querySelector(`#${name}`);
        if (!input) return { error: `Input #${name} not found` };
        const container = input.closest('.d-picker');
        if (!container) return { error: `No .d-picker container for #${name}` };
        const icon = container.querySelector('.cal-icon');
        if (!icon) return { error: `No .cal-icon in .d-picker for #${name}` };
        icon.click();
        return { clicked: true };
    }, fieldName);

    if (clicked.error) {
        throw new Error(`Legacy popup open failed for ${fieldName}: ${clicked.error}`);
    }

    // Wait for kendo-popup to appear
    const popup = page.locator('kendo-popup');
    await popup.waitFor({ state: 'visible', timeout: 5000 });

    // Reuse the same date-only calendar selection logic as non-legacy.
    // The Kendo calendar inside kendo-popup has the same structure:
    // scrollable month list on the left + day grid tbodies on the right.
    await selectDateInDatePicker(page, year, month, day);
}

module.exports = {
    selectDateViaPopup,
    selectDateViaLegacyPopup,
    typeDateInField,
};
