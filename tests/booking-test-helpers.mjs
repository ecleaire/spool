// Supply a valid reference through the real registration UI when testing unrelated features.
export async function addBookingReference(page){
 await page.locator('#bookingReferenceOpen').click();
 await page.locator('#bookingForm [name=files]').fill('https://example.com/fixture.stl');
}
