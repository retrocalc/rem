# Makefile para generación de documentos del estudio
# Requiere: pandoc, latex (para PDF), o utilizar targets que no requieran latex

# Configuración
CHAPTERS = $(wildcard *.md)
CHAPTERS_FILTERED = $(filter-out README.md resumen-ejecutivo.md, $(CHAPTERS))
CHAPTERS_SORTED = 00-glosario.md 01-introduccion-contexto.md 02-problematicas-estructurales.md \
                   03-procedimiento-calculo-remuneraciones.md 04-calculo-retroactivo.md \
                   05-casos-institucionales-nacionales.md 06-analisis-comparativo-internacional.md \
                   07-dimensiones-tecnico-normativas.md 08-impacto-operativo-administrativo.md \
                   09-solucion-integrada-propuesta.md 10-implementacion-adopcion.md \
                   11-beneficios-reconocimiento-textos.md 12-conclusiones-recomendaciones.md \
                   13-bibliografia.md

OUTPUT_DIR = dist
TEX_DIR = $(OUTPUT_DIR)/tex
PDF_DIR = $(OUTPUT_DIR)/pdf
DOCX_DIR = $(OUTPUT_DIR)/docx
HTML_DIR = $(OUTPUT_DIR)/html

# Variables de pandoc
PANDOC = pandoc
PANDOC_FLAGS = --toc --toc-depth=2 --number-sections --standalone
PDF_ENGINE = pdflatex
LATEX_FLAGS = -V geometry:margin=1in -V documentclass=report

.PHONY: all clean pdf docx html resumen help

all: pdf docx html

# Crear directorios de salida
$(OUTPUT_DIR):
	mkdir -p $(OUTPUT_DIR)

$(TEX_DIR): $(OUTPUT_DIR)
	mkdir -p $(TEX_DIR)

$(PDF_DIR): $(OUTPUT_DIR)
	mkdir -p $(PDF_DIR)

$(DOCX_DIR): $(OUTPUT_DIR)
	mkdir -p $(DOCX_DIR)

$(HTML_DIR): $(OUTPUT_DIR)
	mkdir -p $(HTML_DIR)

# Generar documento combinado
estudio-completo.md: $(CHAPTERS_SORTED)
	cat $(CHAPTERS_SORTED) > estudio-completo.md

# PDF del estudio completo (requiere LaTeX)
pdf: $(PDF_DIR) estudio-completo.md
	@echo "Generando PDF del estudio completo..."
	$(PANDOC) $(PANDOC_FLAGS) --pdf-engine=$(PDF_ENGINE) $(LATEX_FLAGS) \
		-o $(PDF_DIR)/estudio-completo.pdf estudio-completo.md
	@echo "Generando PDF del resumen ejecutivo..."
	$(PANDOC) $(PANDOC_FLAGS) --pdf-engine=$(PDF_ENGINE) $(LATEX_FLAGS) \
		-o $(PDF_DIR)/resumen-ejecutivo.pdf resumen-ejecutivo.md
	@echo "PDFs generados en $(PDF_DIR)/"

# PDF sin LaTeX (usando wkhtmltopdf si está disponible)
pdf-html: $(PDF_DIR) estudio-completo.md
	@echo "Generando PDF via HTML (no requiere LaTeX)..."
	$(PANDOC) $(PANDOC_FLAGS) -t html5 -o $(PDF_DIR)/estudio-completo.html estudio-completo.md
	@if command -v wkhtmltopdf >/dev/null 2>&1; then \
		wkhtmltopdf $(PDF_DIR)/estudio-completo.html $(PDF_DIR)/estudio-completo-wkhtml.pdf; \
		echo "PDF generado con wkhtmltopdf en $(PDF_DIR)/estudio-completo-wkhtml.pdf"; \
	else \
		echo "wkhtmltopdf no encontrado. Instale con: sudo apt-get install wkhtmltopdf"; \
	fi

# Documentos Word
docx: $(DOCX_DIR) estudio-completo.md
	@echo "Generando documentos Word..."
	$(PANDOC) $(PANDOC_FLAGS) -o $(DOCX_DIR)/estudio-completo.docx estudio-completo.md
	$(PANDOC) $(PANDOC_FLAGS) -o $(DOCX_DIR)/resumen-ejecutivo.docx resumen-ejecutivo.md
	@echo "Documentos Word generados en $(DOCX_DIR)/"

# HTML
html: $(HTML_DIR) estudio-completo.md
	@echo "Generando HTML..."
	$(PANDOC) $(PANDOC_FLAGS) -t html5 -o $(HTML_DIR)/estudio-completo.html estudio-completo.md
	$(PANDOC) $(PANDOC_FLAGS) -t html5 -o $(HTML_DIR)/resumen-ejecutivo.html resumen-ejecutivo.md
	@echo "HTML generado en $(HTML_DIR)/"

# Resumen ejecutivo solo
resumen: $(PDF_DIR) $(DOCX_DIR) $(HTML_DIR)
	@echo "Generando versiones del resumen ejecutivo..."
	$(PANDOC) $(PANDOC_FLAGS) --pdf-engine=$(PDF_ENGINE) $(LATEX_FLAGS) \
		-o $(PDF_DIR)/resumen-ejecutivo.pdf resumen-ejecutivo.md
	$(PANDOC) $(PANDOC_FLAGS) -o $(DOCX_DIR)/resumen-ejecutivo.docx resumen-ejecutivo.md
	$(PANDOC) $(PANDOC_FLAGS) -t html5 -o $(HTML_DIR)/resumen-ejecutivo.html resumen-ejecutivo.md
	@echo "Resumen ejecutivo generado en múltiples formatos"

# Presentación (ya existe presentacion.md)
presentacion-pdf: $(PDF_DIR)
	@if command -v pandoc >/dev/null 2>&1; then \
		echo "Generando presentación PDF (formato beamer)..."; \
		pandoc presentacion.md -t beamer -o $(PDF_DIR)/presentacion.pdf --slide-level=2; \
		echo "Presentación PDF generada en $(PDF_DIR)/presentacion.pdf"; \
	else \
		echo "pandoc no encontrado. Instale con: sudo apt-get install pandoc"; \
	fi

presentacion-html: $(HTML_DIR)
	@if command -v pandoc >/dev/null 2>&1; then \
		echo "Generando presentación HTML..."; \
		pandoc presentacion.md -t revealjs -o $(HTML_DIR)/presentacion.html -s -V revealjs-url=https://revealjs.com; \
		echo "Presentación HTML generada en $(HTML_DIR)/presentacion.html"; \
	else \
		echo "pandoc no encontrado."; \
	fi

# Ayuda
help:
	@echo "Targets disponibles:"
	@echo "  all          Generar todos los formatos (PDF, DOCX, HTML)"
	@echo "  pdf          Generar PDFs (requiere LaTeX)"
	@echo "  pdf-html     Generar PDF via HTML (no requiere LaTeX, necesita wkhtmltopdf)"
	@echo "  docx         Generar documentos Word"
	@echo "  html         Generar HTML"
	@echo "  resumen      Generar solo el resumen ejecutivo en todos los formatos"
	@echo "  presentacion-pdf   Generar presentación PDF (formato beamer)"
	@echo "  presentacion-html  Generar presentación HTML (formato revealjs)"
	@echo "  clean        Limpiar archivos generados"
	@echo ""
	@echo "Requisitos:"
	@echo "  - pandoc (instalar con: sudo apt-get install pandoc)"
	@echo "  - Para PDF: LaTeX (texlive) o wkhtmltopdf para pdf-html"
	@echo "  - Para presentaciones: pandoc con soporte beamer/revealjs"
	@echo ""
	@echo "Ejemplo: make pdf  # Genera PDF del estudio completo"

# Limpieza
clean:
	rm -rf $(OUTPUT_DIR) estudio-completo.md
	@echo "Archivos generados eliminados"

# Instalación de dependencias (solo para Ubuntu/Debian)
install-deps-ubuntu:
	sudo apt-get update
	sudo apt-get install -y pandoc texlive-latex-base texlive-latex-extra wkhtmltopdf
	@echo "Dependencias instaladas. Puede ejecutar 'make pdf' o 'make pdf-html'"

install-deps-mac:
	brew install pandoc basictex wkhtmltopdf
	@echo "Dependencias instaladas. Puede ejecutar 'make pdf' o 'make pdf-html'"