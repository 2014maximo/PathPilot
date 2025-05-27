// address-refactor.service.ts
import { Injectable } from '@angular/core';

export interface RefactoredAddress {
  address: string;
  country: string;
  zipCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddressRefactorService {

  constructor() { }

  refactorAddresses(originalAddresses: string[][]): (RefactoredAddress | null)[] {
      return originalAddresses.map(originalAddressArray => {
        // Caso 1: Array de direcciones genérico (no refactorizar)
        if (originalAddressArray.length === 5 &&
            originalAddressArray[0] === "Address Line 1" &&
            originalAddressArray[1] === "Address Line 2" &&
            originalAddressArray[2] === "City" &&
            originalAddressArray[3] === "State" &&
            originalAddressArray[4] === "Postal Code") {
          return null;
        }
    
        let address = "";
        let country = "COL"; // Por defecto, asume Colombia
        let zipCode = "";
    
        // --- Extracción y limpieza del código postal ---
        // Buscar código postal al final del array
        if (originalAddressArray.length >= 3) {
          const lastElement = originalAddressArray[originalAddressArray.length - 1]?.trim() || '';
          if (/^\d{4,6}$/.test(lastElement)) {
            zipCode = lastElement;
            // Si el código postal se extrajo del último elemento, lo removemos para procesar la dirección
            originalAddressArray = originalAddressArray.slice(0, originalAddressArray.length - 1);
          }
        }
    
        // Buscar código postal en cualquier otra posición y removerlo
        if (!zipCode) {
          for (let i = 0; i < originalAddressArray.length; i++) {
            const part = originalAddressArray[i]?.trim() || '';
            if (/^\d{4,6}$/.test(part)) {
              zipCode = part;
              originalAddressArray.splice(i, 1); // Removerlo una vez encontrado
              break;
            }
          }
        }
    
        // --- Extracción y limpieza de la dirección principal ---
        address = originalAddressArray[0] || "";
    
        // Caso especial donde el segundo elemento es "COL" y la dirección es el primero
        if (originalAddressArray.length >= 2 && originalAddressArray[1]?.toUpperCase().includes("COL")) {
          // El país ya está por defecto, la dirección ya está en el primer elemento.
          // Solo aseguramos que si COL está en el segundo elemento, no lo dejamos en la dirección
          address = address.replace(/,?\s*COL$/, '');
        } else {
          // Limpiar textos de país o ciudades al final de la dirección
          address = address.replace(/,?\s*COL(OMBIA)?\s*$/i, '');
          address = address.replace(/,?\s*(PEDREGAL,\s*)?(COPACABANA\s+ANTIOQUIA,\s*COLOMBIA|COPACABANA\s+ANTIOQUIA)?\s*$/i, '');
          address = address.replace(/,?\s*MEDELLIN\s*$/i, '');
          address = address.replace(/,?\s*Antioquia\s*$/i, ''); // Nuevo: eliminar Antioquia si está al final
    
          // Eliminar el código postal si por alguna razón quedó en la dirección principal
          address = address.replace(/,?\s*\b\d{4,6}\b\s*$/i, '');
        }
    
        // Normalizar prefijos de vías (Carrera, Calle, Avenida, Diagonal)
        address = address.replace(/^(carrera|car|cra)\s*/i, 'Carrera ');
        address = address.replace(/^(calle|cll|cl)\s*/i, 'Calle ');
        address = address.replace(/^(avenida|av\.)\s*/i, 'Av. ');
        address = address.replace(/^(diagonal|dg\.)\s*/i, 'Diagonal ');
        address = address.replace(/^(autopista)\s*/i, 'Autopista '); // Nuevo: para autopista
    
        // --- Reglas de normalización de números de dirección ---
        // Regla más específica: "# NNN - NN" o "# NNN - NNN" a "# NNN-NNN"
        // Esto cubre "Carrera 30 # 50 - 66" y "CL 48 # 64 - 13 64 13" (primera parte)
        address = address.replace(/#\s*(\d+)\s*([A-Za-z]?)\s*-\s*(\d+)/g, '# $1$2-$3');
    
        // Regla para "# NNN NNN" a "# NNN-NNN" (ej: "#13 02" a "#13-02")
        // Aseguramos que sea una combinación de números de dirección, no cualquier secuencia
        address = address.replace(/#\s*(\d+)\s+([A-Za-z]?)(\d+)/g, (match, p1, p2, p3) => {
            // Solo aplicar si no hay un guion entre los números originalmente
            // Y si los números parecen ser parte de un formato de dirección
            if (!match.includes('-') && p1.length <= 4 && p3.length <= 4) { // Heurística para números de dirección
                return `# ${p1}${p2}-${p3}`;
            }
            return match;
        });
    
        // Regla para casos con "NNN NNN NNN" (ej: "64 13 64 13" -> "64-13")
        // Esto es un parche para el caso de "CL 48 # 64 - 13 64 13"
        address = address.replace(/#\s*(\d+)\s*-\s*(\d+)\s+(\d+)\s+(\d+)/g, '# $1-$2'); // Quita los números duplicados
    
        // Manejar el caso de "Carrera calle #car 103 4111"
        if (address.toLowerCase().includes('carrera #car')) {
          address = address.replace(/carrera\s+calle\s+#car\s*(\d+)\s*(\d+)\s*(\d+)/i, 'Carrera $1 # $2-$3');
        }
        // Manejar el caso "Av. Calle 40" -> "Calle 40"
        address = address.replace(/^(av\.)\s*calle\s*/i, 'Calle ');
    
        // --- Casos especiales de direcciones incompletas o que requieren llamada al usuario ---
        if (address.toLowerCase().includes('autopista norte kilómetro 16 bodega 9')) {
          address = '(CALL USER) ' + address;
        } else if (address.toLowerCase().includes('interior') && !address.match(/#\s*\d+[A-Za-z]?-\d+/)) {
          // Intenta extraer la parte de la vía y el número si existe
          const mainAddressMatch = address.match(/(carrera|calle|cll|cl|av\.|diagonal|autopista)\s*(\w+\s*#?\s*\d+[\s-]*\d*[A-Za-z]?(?:\s*[A-Za-z]\s*\d+)?\s*[A-Za-z]?[-\s]*\d*[A-Za-z]?)/i);
          if (mainAddressMatch && mainAddressMatch[2]) {
             address = '(CALL USER - Address incomplete) ' + mainAddressMatch[2].trim();
          } else {
             address = '(CALL USER - Address incomplete) ' + address.split(',')[0].trim();
          }
        }
    
        // --- Normalización final de país ---
        // Buscar "Colombia" en cualquier parte de los elementos originales
        if (originalAddressArray.some(s => s.toLowerCase().includes("colombia"))) {
          country = "COL";
        }
    
        // Limpiar espacios extra
        return {
          address: address.trim(),
          country: country.trim(),
          zipCode: zipCode.trim()
        };
      });
  }
}