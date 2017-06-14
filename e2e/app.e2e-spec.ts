import { PocGeoPortaalPage } from './app.po';

describe('poc-geo-portaal App', () => {
  let page: PocGeoPortaalPage;

  beforeEach(() => {
    page = new PocGeoPortaalPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!!');
  });
});
