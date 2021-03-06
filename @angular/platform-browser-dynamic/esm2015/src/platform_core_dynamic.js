/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { COMPILER_OPTIONS, CompilerFactory, createPlatformFactory, platformCore } from '@angular/core';
import { JitCompilerFactory } from './compiler_factory';
/**
 * A platform that included corePlatform and the compiler.
 *
 * \@publicApi
 * @type {?}
 */
export const platformCoreDynamic = createPlatformFactory(platformCore, 'coreDynamic', [
    { provide: COMPILER_OPTIONS, useValue: {}, multi: true },
    { provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS] },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm1fY29yZV9keW5hbWljLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvcGxhdGZvcm0tYnJvd3Nlci1keW5hbWljL3NyYy9wbGF0Zm9ybV9jb3JlX2R5bmFtaWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFRQSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUUsZUFBZSxFQUErQixxQkFBcUIsRUFBRSxZQUFZLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDbEksT0FBTyxFQUFDLGtCQUFrQixFQUFDLE1BQU0sb0JBQW9CLENBQUM7Ozs7Ozs7QUFPdEQsTUFBTSxPQUFPLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUU7SUFDcEYsRUFBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFDO0lBQ3RELEVBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsRUFBQztDQUNuRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NPTVBJTEVSX09QVElPTlMsIENvbXBpbGVyRmFjdG9yeSwgUGxhdGZvcm1SZWYsIFN0YXRpY1Byb3ZpZGVyLCBjcmVhdGVQbGF0Zm9ybUZhY3RvcnksIHBsYXRmb3JtQ29yZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQge0ppdENvbXBpbGVyRmFjdG9yeX0gZnJvbSAnLi9jb21waWxlcl9mYWN0b3J5JztcblxuLyoqXG4gKiBBIHBsYXRmb3JtIHRoYXQgaW5jbHVkZWQgY29yZVBsYXRmb3JtIGFuZCB0aGUgY29tcGlsZXIuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgY29uc3QgcGxhdGZvcm1Db3JlRHluYW1pYyA9IGNyZWF0ZVBsYXRmb3JtRmFjdG9yeShwbGF0Zm9ybUNvcmUsICdjb3JlRHluYW1pYycsIFtcbiAge3Byb3ZpZGU6IENPTVBJTEVSX09QVElPTlMsIHVzZVZhbHVlOiB7fSwgbXVsdGk6IHRydWV9LFxuICB7cHJvdmlkZTogQ29tcGlsZXJGYWN0b3J5LCB1c2VDbGFzczogSml0Q29tcGlsZXJGYWN0b3J5LCBkZXBzOiBbQ09NUElMRVJfT1BUSU9OU119LFxuXSk7XG4iXX0=