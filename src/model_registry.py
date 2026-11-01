import json
from pathlib import Path


CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"
AI_CATALOG_PATH = CONFIG_DIR / "ai_catalog.json"


def load_model_catalog():
    try:
        with AI_CATALOG_PATH.open("r", encoding="utf-8") as file:
            catalog = json.load(file)

        categories = catalog["categories"]
        if not isinstance(categories, list):
            raise ValueError("'categories' must be a list.")

        category_ids = set()
        model_ids = set()

        for category in categories:
            category_id = category["id"]

            if category_id in category_ids:
                raise ValueError(f"Duplicate category ID: {category_id}")
            category_ids.add(category_id)

            relative_path = Path(category["file"])
            if relative_path.is_absolute() or ".." in relative_path.parts:
                raise ValueError(f"Invalid catalog path: {relative_path}")

            category_path = (CONFIG_DIR / relative_path).resolve()
            if not category_path.is_relative_to(CONFIG_DIR.resolve()):
                raise ValueError(
                    f"Catalog path escapes config directory: {relative_path}"
                )

            with category_path.open("r", encoding="utf-8") as file:
                category_data = json.load(file)

            models = category_data.get("models")
            if not isinstance(models, list):
                raise ValueError(
                    f"Invalid models list in category: {category_id}"
                )

            for model in models:
                model_id = model["id"]

                if model_id in model_ids:
                    raise ValueError(f"Duplicate model ID: {model_id}")
                model_ids.add(model_id)

                model["category_id"] = category_id

            category["models"] = models

        return catalog

    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise RuntimeError("Unable to load AI model catalog.") from exc


def get_model_config(category_id: str, model_id: str):
    catalog = load_model_catalog()

    for category in catalog["categories"]:
        if category["id"] != category_id:
            continue

        if not category.get("enabled", False):
            raise ValueError(f"Category is disabled: {category_id}")

        for model in category["models"]:
            if model["id"] == model_id:
                if not model.get("enabled", False):
                    raise ValueError(f"Model is disabled: {model_id}")
                return model

        raise ValueError(f"Model not found: {model_id}")

    raise ValueError(f"Category not found: {category_id}")
