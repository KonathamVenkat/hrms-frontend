import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { TranslatedTitleStrategy } from './translated-title-strategy';

describe('TranslatedTitleStrategy', () => {
  const langChange = new Subject<unknown>();
  const translations: Record<string, string> = { 'employee.routes.list': 'Employees' };
  let strategy: TranslatedTitleStrategy;
  let setTitle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setTitle = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Title, useValue: { setTitle } },
        {
          provide: TranslateService,
          useValue: {
            onLangChange: langChange,
            onTranslationChange: new Subject<unknown>(),
            instant: (key: string) => translations[key] ?? key,
          },
        },
      ],
    });
    strategy = TestBed.inject(TranslatedTitleStrategy);
    vi.spyOn(strategy, 'buildTitle');
  });

  function navigateTo(title: string): void {
    (strategy.buildTitle as ReturnType<typeof vi.fn>).mockReturnValue(title);
    strategy.updateTitle({} as RouterStateSnapshot);
  }

  it('translates a key and adds the app suffix', () => {
    navigateTo('employee.routes.list');
    expect(setTitle).toHaveBeenCalledWith('Employees · EHRMS');
  });

  it('leaves a plain title alone', () => {
    navigateTo('Dashboard · EHRMS');
    expect(setTitle).toHaveBeenCalledWith('Dashboard · EHRMS');
  });

  it('updates the title when the language changes', () => {
    navigateTo('employee.routes.list');
    translations['employee.routes.list'] = 'Employés';
    langChange.next({});
    expect(setTitle).toHaveBeenLastCalledWith('Employés · EHRMS');
    translations['employee.routes.list'] = 'Employees';
  });
});
