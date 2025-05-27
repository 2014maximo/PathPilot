import { TestBed } from '@angular/core/testing';

import { AddressRefactorService } from './address-refactor.service';

describe('AddressRefactorService', () => {
  let service: AddressRefactorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddressRefactorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
