import { TestBed } from '@angular/core/testing';
import { Router, TitleStrategy } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { appConfig } from './app.config';
import { ApplicationInitStatus } from '@angular/core';

describe('appConfig', () => {
  it('can create the router and title strategy without a dependency loop', async () => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClient()] });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    expect(TestBed.inject(Router)).toBeTruthy();
    expect(TestBed.inject(TitleStrategy)).toBeTruthy();
  });
});
