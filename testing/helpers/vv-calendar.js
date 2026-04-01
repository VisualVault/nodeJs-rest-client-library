/**
 * Calendar-specific helpers for VV date field Playwright tests.
 *
 * These helpers interact with the AngularJS uib-datepicker calendar popup
 * and the date spinbutton input used in VV FormViewer.
 *
 * For generic VV form helpers (navigation, field verification, value capture),
 * see ./vv-form.js.
 */

/**
 * Open the calendar popup for a date field and select a specific day.
 *
 * Works with the AngularJS uib-datepicker used in VV FormViewer. The calendar popup
 * is a scrollable grid with a month list on the left and month-by-month day grids on
 * the right. Each month is a separate `<tbody>` section within a `<table role="grid">`.
 *
 * Selection strategy:
 * 1. Click the toggle button (VV uses two label variants depending on field type:
 *    "Toggle calendar" for date-only spinbutton fields, "Toggle popup" for datetime fields)
 * 2. Scroll the month list to the target month (click the abbreviated month name)
 * 3. Wait for the target month's tbody to appear in the grid
 * 4. Find the correct `<tbody>` by matching its header row text ("March 2026")
 * 5. Click the day cell within that specific tbody (avoids hitting the same day number
 *    in an adjacent month's tbody)
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName - e.g., "DataField7"
 * @param {number} year - e.g., 2026
 * @param {number} month - 1-indexed (1=Jan, 3=Mar, 12=Dec)
 * @param {number} day - day of month (1-31)
 */
async function selectDateViaPopup(page, fieldName, year, month, day) {
    const fieldContainer = page.locator(`[aria-label="${fieldName}"]`);
    const toggleBtn = fieldContainer
        .getByRole('button', { name: 'Toggle calendar' })
        .or(fieldContainer.getByRole('button', { name: 'Toggle popup' }));
    await toggleBtn.click();

    const grid = page.locator('[role="grid"]');
    await grid.waitFor({ state: 'visible', timeout: 5000 });

    const monthNames = [
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
    const targetHeader = `${monthNames[month]} ${year}`;

    // Scroll the month list to bring the target month into view.
    // Scope the selector to the calendar popup to avoid matching unrelated <li> elements.
    const monthShort = monthNames[month].substring(0, 3);
    const popup = page.locator('.uib-datepicker-popup, [uib-datepicker-popup-wrap]').or(grid.locator('..'));
    const monthListItem = popup
        .locator('li')
        .filter({ hasText: new RegExp(`^${monthShort}$`) })
        .first();
    await monthListItem.scrollIntoViewIfNeeded();
    await monthListItem.click();

    // Wait for the target month's tbody to appear in the grid instead of using
    // an arbitrary timeout. This ensures the calendar has scrolled/animated.
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

    // Each month in the grid is a separate <tbody> with a header row containing "Month Year".
    // We must find the correct tbody to avoid clicking a day in an adjacent month.
    const tbodies = await grid.locator('tbody').all();
    for (const tbody of tbodies) {
        const headerText = await tbody
            .locator('tr')
            .first()
            .textContent()
            .catch(() => '');
        if (headerText.includes(targetHeader)) {
            const dayCell = tbody
                .locator('td')
                .filter({ hasText: new RegExp(`^${day}$`) })
                .first();
            await dayCell.locator('span, div').first().click();
            return;
        }
    }

    throw new Error(`Could not find ${targetHeader} in calendar popup`);
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
 * @param {string} fieldName - e.g., "DataField7"
 * @param {string} dateStr - formatted date string with segments separated by / : or space
 */
async function typeDateInField(page, fieldName, dateStr) {
    const fieldContainer = page.locator(`[aria-label="${fieldName}"]`);
    const input = fieldContainer.locator('input').first();
    await input.click();

    // Split on segment separators and type each part individually.
    // The spinbutton auto-advances to the next segment after each is filled.
    const parts = dateStr.split(/[/ :]/);
    for (const part of parts) {
        await page.keyboard.type(part);
    }

    // Tab out of the field to trigger VV's value processing (save handler runs on blur).
    await page.keyboard.press('Tab');

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

module.exports = {
    selectDateViaPopup,
    typeDateInField,
};
